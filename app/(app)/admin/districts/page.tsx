import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { updateDistrict, toggleDistrictActive } from "./actions";

export const metadata = { title: "Districts - PRETAG AMIS" };

export default async function DistrictsPage() {
  const supabase = createClient();
  const [{ data: districts, error }, { data: zones }] = await Promise.all([
    supabase
      .from("districts")
      .select("id, district_name, district_code, is_active, zone_id")
      .order("district_name"),
    supabase.from("zones").select("id, zone_name").order("zone_name"),
  ]);

  return (
    <>
      <PageHeader
        title="Districts"
        sub="Every administrative district / municipality. Reassign a district to a different zone here."
      />
      {error && <p className="text-decline font-mono text-sm">{error.message}</p>}
      <p className="text-xs font-mono text-ink-3 mb-3">{districts?.length ?? 0} districts</p>

      <div className="flex flex-col gap-1.5">
        {districts?.map((d) => (
          <div
            key={d.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_6rem_1fr_10rem_5rem] gap-2 md:gap-3 md:items-center bg-surface border border-border rounded px-3 py-2"
          >
            <form id={`d-${d.id}`} action={updateDistrict} className="contents">
              <input type="hidden" name="id" value={d.id} />
              <input
                name="district_name"
                defaultValue={d.district_name}
                className="border border-border-strong md:border-transparent hover:border-border-strong focus:border-primary rounded bg-ground md:bg-transparent px-2 py-1 text-sm outline-none"
              />
              <input
                name="district_code"
                defaultValue={d.district_code}
                className="border border-border-strong md:border-transparent hover:border-border-strong focus:border-primary rounded bg-ground md:bg-transparent px-2 py-1 text-sm font-mono uppercase outline-none w-24"
              />
              <select
                name="zone_id"
                defaultValue={d.zone_id}
                className="border border-border-strong rounded bg-ground px-2 py-1 text-sm outline-none focus:border-primary"
              >
                {zones?.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.zone_name}
                  </option>
                ))}
              </select>
            </form>

            <form action={toggleDistrictActive} className="flex items-center gap-2 self-center">
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="is_active" value={String(d.is_active)} />
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                  d.is_active ? "bg-grow-wash text-grow" : "bg-surface-2 text-ink-3"
                }`}
              >
                {d.is_active ? "active" : "inactive"}
              </span>
              <button className="font-mono text-[11px] underline text-ink-3 hover:text-primary">
                {d.is_active ? "off" : "on"}
              </button>
            </form>

            <div className="self-center">
              <SubmitButton form={`d-${d.id}`} variant="ghost">
                Save
              </SubmitButton>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
