import { PageHeader, Card } from "@/components/ui";
import { CompareTable } from "@/components/CompareTable";
import { createClient } from "@/lib/supabase/server";
import { getImportedPeriods, comparePeriods, periodSummary } from "@/lib/analytics";

export const metadata = { title: "Zone Analysis - PRETAG AMIS" };

export default async function ZoneAnalysisPage({ searchParams }: { searchParams: { zone?: string } }) {
  const periods = await getImportedPeriods();
  if (periods.length === 0) {
    return (
      <>
        <PageHeader title="Zone Analysis" />
        <p className="text-ink-3 font-mono text-sm">No R20 imported yet.</p>
      </>
    );
  }

  const zoneId = searchParams.zone ? Number(searchParams.zone) : null;

  // 18-zone ranking (needs two periods) or single-period counts
  if (periods.length >= 2 && !zoneId) {
    const rows = (await comparePeriods(periods[1].id, periods[0].id)).filter((r) => r.level === "zone");
    return (
      <>
        <PageHeader title="Zone Analysis" sub={`Ranked by net change, ${periods[1].label} to ${periods[0].label}`} />
        <CompareTable rows={rows} linkZones />
      </>
    );
  }

  if (zoneId) {
    const supabase = createClient();
    const { data: zone } = await supabase
      .from("zones")
      .select("id, zone_name")
      .eq("id", zoneId)
      .single();

    // A large zone (e.g. Kumasi) has well over 1000 members, and a plain select
    // is capped at 1000 - page through so the district counts are complete.
    const byDistrict = new Map<string, number>();
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("membership_snapshots")
        .select("district_id, districts(district_name)")
        .eq("period_id", periods[0].id)
        .eq("zone_id", zoneId)
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      for (const r of data ?? []) {
        const n = (r.districts as { district_name?: string } | null)?.district_name ?? "Unassigned";
        byDistrict.set(n, (byDistrict.get(n) ?? 0) + 1);
      }
      if (!data || data.length < PAGE) break;
    }
    const list = [...byDistrict.entries()].sort((a, b) => b[1] - a[1]);
    return (
      <>
        <PageHeader title={zone?.zone_name ?? "Zone"} sub={`Districts - ${periods[0].label}`} />
        <Card>
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b-2 border-border-strong text-left text-[11px] uppercase tracking-wide text-ink-2">
                <th className="py-2">District</th>
                <th className="py-2 text-right">Members ({periods[0].label})</th>
              </tr>
            </thead>
            <tbody>
              {list.map(([name, count]) => (
                <tr key={name} className="border-b border-border last:border-0">
                  <td className="py-2">{name}</td>
                  <td className="py-2 text-right tabular-nums">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </>
    );
  }

  const summary = await periodSummary(periods[0].id);
  return (
    <>
      <PageHeader title="Zone Analysis" sub={`Members by zone, ${periods[0].label}. Import a second month for growth figures.`} />
      <Card>
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="border-b-2 border-border-strong text-left text-[11px] uppercase tracking-wide text-ink-2">
              <th className="py-2">Zone</th>
              <th className="py-2 text-right">Members ({periods[0].label})</th>
            </tr>
          </thead>
          <tbody>
            {summary.zones.map((z) => (
              <tr key={z.zoneId} className="border-b border-border last:border-0">
                <td className="py-2">{z.name}</td>
                <td className="py-2 text-right tabular-nums">{z.members}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
