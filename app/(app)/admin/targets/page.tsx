import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { PageHeader, Card } from "@/components/ui";
import { SubmitButton } from "@/components/forms";

export const metadata = { title: "Membership Targets - PRETAG AMIS" };

async function saveTarget(formData: FormData) {
  "use server";
  const session = await requireAdmin();
  const zoneRaw = String(formData.get("zone_id") ?? "");
  const zone_id = zoneRaw === "region" ? null : Number(zoneRaw);
  const year = Number(formData.get("year"));
  const target_members = Number(formData.get("target_members"));
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!year || Number.isNaN(target_members)) return;

  const supabase = createClient();
  const { error } = await supabase.from("membership_targets").upsert(
    { zone_id, year, target_members, note, created_by: session.profile.id },
    { onConflict: "zone_id,year" },
  );
  if (error) throw new Error(error.message);
  await logAudit({ action: "target.set", resourceType: "membership_target", details: { zone_id, year, target_members } });
  revalidatePath("/admin/targets");
  revalidatePath("/dashboard");
}

export default async function TargetsPage() {
  await requireAdmin();
  const supabase = createClient();
  const year = new Date().getFullYear();
  const [{ data: zones }, { data: targets }] = await Promise.all([
    supabase.from("zones").select("id, zone_name").order("zone_name"),
    supabase.from("membership_targets").select("zone_id, year, target_members, note, zones(zone_name)").order("year", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title="Membership Targets"
        sub="Set an annual target for the region or a zone. Progress shows on the dashboard and zone analysis."
      />

      <Card className="mb-6">
        <h3 className="font-display text-sm uppercase tracking-tight mb-3">Set a target</h3>
        <form action={saveTarget} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Scope</span>
            <select name="zone_id" className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
              <option value="region">Whole region</option>
              {zones?.map((z) => <option key={z.id} value={z.id}>{z.zone_name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Year</span>
            <input name="year" type="number" defaultValue={year} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm font-mono w-24" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Target members</span>
            <input name="target_members" type="number" min="0" required className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm font-mono w-32" />
          </label>
          <label className="flex flex-col gap-1 grow">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Note (optional)</span>
            <input name="note" className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm" />
          </label>
          <SubmitButton>Save</SubmitButton>
        </form>
      </Card>

      <div className="overflow-x-auto border border-border rounded">
        <table className="w-full text-sm font-mono min-w-[480px]">
          <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">Scope</th>
              <th className="text-right px-3 py-2">Year</th>
              <th className="text-right px-3 py-2">Target</th>
              <th className="text-left px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {targets?.map((t, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-3 py-2">{(t.zones as { zone_name?: string } | null)?.zone_name ?? "Whole region"}</td>
                <td className="px-3 py-2 text-right">{t.year}</td>
                <td className="px-3 py-2 text-right tabular-nums">{t.target_members.toLocaleString()}</td>
                <td className="px-3 py-2 text-ink-3">{t.note}</td>
              </tr>
            ))}
            {!targets?.length && (
              <tr><td colSpan={4} className="px-3 py-3 text-ink-3">No targets set.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
