import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { getImportedPeriods, compareDistricts, periodSummary } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "District Analysis - PRETAG AMIS" };

function pct(v: number | null) {
  return v === null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export default async function DistrictAnalysisPage() {
  const periods = await getImportedPeriods();
  if (periods.length === 0) {
    return (
      <>
        <PageHeader title="District Analysis" />
        <p className="text-ink-3 font-mono text-sm">No R20 imported yet.</p>
      </>
    );
  }

  if (periods.length < 2) {
    const supabase = createClient();
    // Page through - a month's R20 is several thousand rows and a plain select
    // stops at 1000.
    const tally = new Map<string, { zone: string; count: number }>();
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error } = await supabase
        .from("membership_snapshots")
        .select("district_id, districts(district_name, zones(zone_name))")
        .eq("period_id", periods[0].id)
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) {
        const d = r.districts as { district_name?: string; zones?: { zone_name?: string } } | null;
        const key = d?.district_name ?? "Unassigned";
        const cur = tally.get(key) ?? { zone: d?.zones?.zone_name ?? "", count: 0 };
        cur.count += 1;
        tally.set(key, cur);
      }
      if (!rows || rows.length < PAGE) break;
    }
    const list = [...tally.entries()].sort((a, b) => b[1].count - a[1].count);
    return (
      <>
        <PageHeader title="District Analysis" sub={`Members by district, ${periods[0].label}`} />
        <div className="overflow-x-auto border border-border rounded">
          <table className="w-full text-sm font-mono min-w-[480px]">
            <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
              <tr><th className="text-left px-3 py-2">District</th><th className="text-left px-3 py-2">Zone</th><th className="text-right px-3 py-2">Members</th></tr>
            </thead>
            <tbody>
              {list.map(([name, v]) => (
                <tr key={name} className="border-t border-border hover:bg-surface-2">
                  <td className="px-3 py-2">{name}</td>
                  <td className="px-3 py-2 text-ink-3">{v.zone}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{v.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  const rows = (await compareDistricts(periods[1].id, periods[0].id)).filter(
    (r) => r.previous > 0 || r.current > 0,
  );

  return (
    <>
      <PageHeader
        title="District Analysis"
        sub={`${periods[1].label} to ${periods[0].label}, all districts with members`}
      />
      <div className="overflow-x-auto border border-border rounded">
        <table className="w-full text-sm font-mono min-w-[760px]">
          <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2">District</th>
              <th className="text-left px-3 py-2">Zone</th>
              <th className="text-right px-3 py-2">Prev</th>
              <th className="text-right px-3 py-2">Curr</th>
              <th className="text-right px-3 py-2">Added</th>
              <th className="text-right px-3 py-2">Missing</th>
              <th className="text-right px-3 py-2">In</th>
              <th className="text-right px-3 py-2">Out</th>
              <th className="text-right px-3 py-2">Net</th>
              <th className="text-right px-3 py-2">Growth</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.district_id} className="border-t border-border hover:bg-surface-2">
                <td className="px-3 py-2">
                  <Link href={`/analytics/districts/${r.district_id}`} className="underline">{r.name}</Link>
                </td>
                <td className="px-3 py-2 text-ink-3">{r.zone_name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.previous}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.current}</td>
                <td className="px-3 py-2 text-right tabular-nums text-grow">+{r.added}</td>
                <td className="px-3 py-2 text-right tabular-nums text-decline">-{r.missing}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-3">{r.transfers_in || "-"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-3">{r.transfers_out || "-"}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${r.net > 0 ? "text-grow" : r.net < 0 ? "text-decline" : ""}`}>
                  {r.net > 0 ? "+" : ""}{r.net}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{pct(r.growth_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-2 mt-3 max-w-3xl">
        <span className="font-bold text-grow">Added</span> = new to the R20 &middot;{" "}
        <span className="font-bold text-decline">Missing</span> = dropped out of the R20 &middot;{" "}
        <span className="font-bold">In / Out</span> = moved between districts (still in the region) &middot;{" "}
        <span className="font-bold">Net</span> = Current &minus; Previous = Added + In &minus; Missing &minus; Out
        (a district can have a positive Added and still a negative Net).
      </p>
    </>
  );
}
