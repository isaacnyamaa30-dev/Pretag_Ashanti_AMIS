import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { updateZone, toggleZoneActive } from "./actions";

export const metadata = { title: "Zones - PRETAG AMIS" };

export default async function ZonesPage() {
  const supabase = createClient();
  const { data: zones, error } = await supabase
    .from("zones")
    .select("id, zone_name, zone_code, is_active, districts(count)")
    .order("zone_name");

  return (
    <>
      <PageHeader
        title="Zones"
        sub="The 18 PRETAG Ashanti zones. Rename, recode or deactivate a zone here - no code change needed."
      />
      {error && <p className="text-decline font-mono text-sm">{error.message}</p>}

      <div className="flex flex-col gap-1.5">
        <div className="hidden md:grid grid-cols-[1fr_7rem_5rem_11rem_5rem] gap-3 px-3 text-[11px] font-mono uppercase tracking-wide text-ink-3">
          <span>Zone name</span>
          <span>Code</span>
          <span className="text-right">Districts</span>
          <span>Status</span>
          <span></span>
        </div>

        {zones?.map((z) => {
          const districts = (z.districts as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <div
              key={z.id}
              className="grid grid-cols-2 md:grid-cols-[1fr_7rem_5rem_11rem_5rem] gap-2 md:gap-3 md:items-center bg-surface border border-border rounded px-3 py-2"
            >
              <form
                id={`zone-${z.id}`}
                action={updateZone}
                className="contents"
              >
                <input type="hidden" name="id" value={z.id} />
                <input
                  name="zone_name"
                  defaultValue={z.zone_name}
                  className="border border-border-strong md:border-transparent hover:border-border-strong focus:border-primary rounded bg-ground md:bg-transparent px-2 py-1 text-sm outline-none"
                />
                <input
                  name="zone_code"
                  defaultValue={z.zone_code}
                  className="border border-border-strong md:border-transparent hover:border-border-strong focus:border-primary rounded bg-ground md:bg-transparent px-2 py-1 text-sm font-mono uppercase outline-none w-20"
                />
              </form>

              <span className="md:text-right font-mono text-sm tabular-nums text-ink-2 self-center">
                {districts} <span className="md:hidden text-ink-3">districts</span>
              </span>

              <form action={toggleZoneActive} className="flex items-center gap-2 self-center">
                <input type="hidden" name="id" value={z.id} />
                <input type="hidden" name="is_active" value={String(z.is_active)} />
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                    z.is_active ? "bg-grow-wash text-grow" : "bg-surface-2 text-ink-3"
                  }`}
                >
                  {z.is_active ? "active" : "inactive"}
                </span>
                <button className="font-mono text-[11px] underline text-ink-3 hover:text-primary">
                  {z.is_active ? "deactivate" : "activate"}
                </button>
              </form>

              <div className="self-center">
                <SubmitButton form={`zone-${z.id}`} variant="ghost">
                  Save
                </SubmitButton>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
