import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { getImportedPeriods } from "@/lib/analytics";

export const metadata = { title: "District - PRETAG AMIS" };

export default async function DistrictDrillPage({
  params,
  searchParams,
}: {
  params: { districtId: string };
  searchParams: { period?: string };
}) {
  const supabase = createClient();
  const districtId = Number(params.districtId);
  const periods = await getImportedPeriods();
  if (periods.length === 0) notFound();

  const periodId = Number(searchParams.period) || periods[0].id;
  const period = periods.find((p) => p.id === periodId) ?? periods[0];

  const [{ data: district }, { data: mus }] = await Promise.all([
    supabase.from("districts").select("district_name, zones(zone_name)").eq("id", districtId).maybeSingle(),
    supabase.rpc("management_unit_breakdown", { p_period: periodId, p_district: districtId }),
  ]);
  if (!district) notFound();

  const rows = (mus ?? []) as { management_unit: string; members: number }[];
  const total = rows.reduce((a, b) => a + Number(b.members), 0);
  const max = Number(rows[0]?.members ?? 1);

  return (
    <>
      <PageHeader
        title={district.district_name}
        sub={`${(district.zones as { zone_name?: string } | null)?.zone_name} zone · management units · ${period.label}`}
      />
      <Link href="/analytics/districts" className="text-xs font-mono underline text-ink-3 hover:text-primary">
        &larr; all districts
      </Link>

      <div className="flex flex-wrap items-center gap-3 my-4">
        <form method="get" className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Month</span>
            <select name="period" defaultValue={periodId} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
              {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <button className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5">Show</button>
        </form>
        <span className="font-mono text-sm text-ink-3">{total} members · {rows.length} management units</span>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm font-mono">
          <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">Management unit</th>
              <th className="text-right px-3 py-2 w-40">Members</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.management_unit} className="border-t border-border hover:bg-surface-2">
                <td className="px-3 py-1.5">{r.management_unit}</td>
                <td className="px-3 py-1.5 text-right">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 rounded-full bg-primary/60" style={{ width: `${Math.max(4, (Number(r.members) / max) * 90)}px` }} />
                    <span className="tabular-nums">{r.members}</span>
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={2} className="px-3 py-3 text-ink-3">No members in this district for {period.label}.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
