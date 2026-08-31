import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { addAlias, deleteAlias } from "./actions";

export const metadata = { title: "District Aliases - PRETAG AMIS" };

export default async function AliasesPage() {
  const supabase = createClient();
  const [{ data: aliases, error }, { data: districts }] = await Promise.all([
    supabase
      .from("district_aliases")
      .select("id, alias, normalized_alias, districts(district_name, zones(zone_name))")
      .order("alias"),
    supabase.from("districts").select("id, district_name, zones(zone_name)").order("district_name"),
  ]);

  return (
    <>
      <PageHeader
        title="District Aliases"
        sub="Every R20 spelling that resolves to a canonical district. The importer adds new ones here from the validation queue; you can also add them by hand."
      />

      <Card className="mb-6">
        <h3 className="font-display text-sm uppercase tracking-tight mb-3">Add an alias</h3>
        <form action={addAlias} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 grow">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">
              Alias (exactly as it appears in the R20)
            </span>
            <input
              name="alias"
              required
              placeholder="e.g. Kumasi Metropolitan Assembly"
              className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">
              Resolves to district
            </span>
            <select
              name="district_id"
              required
              className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            >
              <option value="">Choose...</option>
              {districts?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.district_name} ({(d.zones as { zone_name?: string } | null)?.zone_name})
                </option>
              ))}
            </select>
          </label>
          <SubmitButton>Add</SubmitButton>
        </form>
      </Card>

      {error && <p className="text-decline font-mono text-sm">{error.message}</p>}
      <p className="text-xs font-mono text-ink-3 mb-3">{aliases?.length ?? 0} aliases</p>

      <div className="overflow-x-auto border border-border rounded">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-primary text-on-primary font-mono text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">Alias</th>
              <th className="text-left px-3 py-2">Resolves to</th>
              <th className="text-left px-3 py-2">Zone</th>
              <th className="px-3 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {aliases?.map((a) => {
              const district = a.districts as
                | { district_name?: string; zones?: { zone_name?: string } }
                | null;
              return (
                <tr key={a.id} className="border-t border-border hover:bg-surface-2">
                  <td className="px-3 py-2 font-mono">{a.alias}</td>
                  <td className="px-3 py-2">{district?.district_name}</td>
                  <td className="px-3 py-2 text-ink-3">{district?.zones?.zone_name}</td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteAlias}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="font-mono text-[11px] underline text-ink-3 hover:text-decline">
                        delete
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
