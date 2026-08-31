import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { PageHeader, Card } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { ResetMembershipData } from "@/components/ResetMembershipData";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Settings - PRETAG AMIS" };

async function saveBands(formData: FormData) {
  "use server";
  await requireAdmin();
  const growing_above = Number(formData.get("growing_above"));
  const declining_below = Number(formData.get("declining_below"));
  if (Number.isNaN(growing_above) || Number.isNaN(declining_below)) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("settings")
    .update({ value: { growing_above, declining_below } })
    .eq("key", "performance_bands");
  if (error) throw new Error(error.message);
  await logAudit({ action: "settings.update", resourceId: "performance_bands", details: { growing_above, declining_below } });
  revalidatePath("/admin/settings");
}

async function saveWeights(formData: FormData) {
  "use server";
  await requireAdmin();
  const keys = ["growth", "retention", "acquisition", "consistency"] as const;
  const raw = Object.fromEntries(keys.map((k) => [k, Math.max(0, Number(formData.get(k)) || 0)]));
  const total = keys.reduce((a, k) => a + raw[k], 0) || 1;
  const value = Object.fromEntries(keys.map((k) => [k, Math.round((raw[k] / total) * 100) / 100]));
  const supabase = createClient();
  const { error } = await supabase.from("settings").update({ value }).eq("key", "scorecard_weights");
  if (error) throw new Error(error.message);
  await logAudit({ action: "settings.update", resourceId: "scorecard_weights", details: value });
  revalidatePath("/admin/settings");
  revalidatePath("/analytics/scorecard");
}

export default async function SettingsPage() {
  const supabase = createClient();
  const [{ data }, session] = await Promise.all([
    supabase.from("settings").select("key, value"),
    getSessionUser(),
  ]);
  const bands = (data?.find((s) => s.key === "performance_bands")?.value ?? {
    growing_above: 0.5,
    declining_below: -0.5,
  }) as { growing_above: number; declining_below: number };
  const weights = (data?.find((s) => s.key === "scorecard_weights")?.value ?? {
    growth: 0.35, retention: 0.3, acquisition: 0.2, consistency: 0.15,
  }) as Record<string, number>;
  const isSuperAdmin = session?.profile?.role === "Super Administrator";

  return (
    <>
      <PageHeader title="Settings" sub="Region-wide defaults. Changing these re-classifies every zone and district." />

      <Card className="max-w-lg">
        <h3 className="font-display text-sm uppercase tracking-tight mb-1">Performance classification</h3>
        <p className="text-sm text-ink-2 mb-4">
          A zone or district is <span className="text-grow font-medium">Growing</span> when growth is above
          the upper band, <span className="text-decline font-medium">Declining</span> when below the lower
          band, and <span className="text-stable font-medium">Stable</span> in between. Growth is shown as
          &quot;n/a&quot; when the previous period had zero members.
        </p>
        <form action={saveBands} className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Growing above (%)</span>
            <input
              name="growing_above"
              type="number"
              step="0.1"
              defaultValue={bands.growing_above}
              className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm font-mono w-28 outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Declining below (%)</span>
            <input
              name="declining_below"
              type="number"
              step="0.1"
              defaultValue={bands.declining_below}
              className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm font-mono w-28 outline-none focus:border-primary"
            />
          </label>
          <SubmitButton>Save</SubmitButton>
        </form>
      </Card>

      <Card className="max-w-lg mt-6">
        <h3 className="font-display text-sm uppercase tracking-tight mb-1">Zone scorecard weights</h3>
        <p className="text-sm text-ink-2 mb-4">
          How much each factor counts toward a zone&apos;s performance score. Values are normalised to
          add up to 100%.
        </p>
        <form action={saveWeights} className="grid grid-cols-2 gap-3 max-w-sm">
          {(["growth", "retention", "acquisition", "consistency"] as const).map((k) => (
            <label key={k} className="flex flex-col gap-1">
              <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">{k}</span>
              <input
                name={k}
                type="number"
                step="0.05"
                min="0"
                defaultValue={weights[k]}
                className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm font-mono outline-none focus:border-primary"
              />
            </label>
          ))}
          <div className="col-span-2">
            <SubmitButton>Save weights</SubmitButton>
          </div>
        </form>
      </Card>

      {isSuperAdmin && (
        <div className="mt-10 max-w-lg">
          <ResetMembershipData />
        </div>
      )}
    </>
  );
}
