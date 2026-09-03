import { PageHeader, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getImportedPeriods, comparePeriods } from "@/lib/analytics";
import { getWeights, scoreZones } from "@/lib/scorecard";

export const metadata = { title: "Zone Scorecard - PRETAG AMIS" };

export default async function ScorecardPage() {
  const periods = await getImportedPeriods();
  if (periods.length < 2) {
    return (
      <>
        <PageHeader title="Zone Performance Scorecard" />
        <p className="text-ink-3 font-mono text-sm">Needs at least two imported R20s.</p>
      </>
    );
  }

  const supabase = createClient();
  const [rows, weights, { data: zs }] = await Promise.all([
    comparePeriods(periods[1].id, periods[0].id),
    getWeights(),
    supabase.rpc("zone_series"),
  ]);

  // consistency: 100 minus the spread of month-on-month growth %, per zone
  const byZone = new Map<number, { label: string; members: number }[]>();
  for (const r of (zs ?? []) as { zone_id: number; label: string; members: number }[]) {
    const list = byZone.get(r.zone_id) ?? [];
    list.push({ label: r.label, members: Number(r.members) });
    byZone.set(r.zone_id, list);
  }
  const consistency = new Map<number, number>();
  for (const [zoneId, series] of byZone) {
    if (series.length < 3) {
      consistency.set(zoneId, 60);
      continue;
    }
    const rates: number[] = [];
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1].members;
      if (prev > 0) rates.push(((series[i].members - prev) / prev) * 100);
    }
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const sd = Math.sqrt(rates.reduce((a, b) => a + (b - mean) ** 2, 0) / rates.length);
    consistency.set(zoneId, Math.max(0, 100 - sd * 10));
  }

  const scores = scoreZones(rows, weights, consistency);
  const w = weights;

  return (
    <>
      <PageHeader
        title="Zone Performance Scorecard"
        sub={`Weighted 0-100 index, ${periods[1].label} to ${periods[0].label}`}
      />
      <p className="text-xs font-mono text-ink-3 mb-4">
        Each of the four factor columns is scored 0&ndash;100; the Score is their weighted average.
        Weights &mdash; growth {(w.growth * 100).toFixed(0)}% &middot; retention {(w.retention * 100).toFixed(0)}% &middot;
        acquisition {(w.acquisition * 100).toFixed(0)}% &middot; consistency {(w.consistency * 100).toFixed(0)}%.
        Adjust in Administration &rarr; Settings.
      </p>

      <div className="overflow-x-auto border border-border rounded">
        <table className="w-full text-sm font-mono min-w-[640px]">
          <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2 w-8">#</th>
              <th className="text-left px-3 py-2">Zone</th>
              <th className="text-right px-3 py-2">Score</th>
              <th className="text-right px-3 py-2">Growth /100</th>
              <th className="text-right px-3 py-2">Retention /100</th>
              <th className="text-right px-3 py-2">Acquisition /100</th>
              <th className="text-right px-3 py-2">Consistency /100</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => (
              <tr key={s.zoneId} className="border-t border-border hover:bg-surface-2">
                <td className="px-3 py-2 text-ink-3">{i + 1}</td>
                <td className="px-3 py-2">{s.name}</td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-1.5 rounded-full bg-primary/70"
                      style={{ width: `${Math.max(4, s.score)}px` }}
                      aria-hidden
                    />
                    <span className="tabular-nums font-medium">{s.score.toFixed(1)}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-3">{s.parts.growth}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-3">{s.parts.retention}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-3">{s.parts.acquisition}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-3">{s.parts.consistency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] font-mono text-ink-3 mt-3">
        Consistency needs three or more months to be meaningful; with two it defaults to a neutral value.
      </p>
    </>
  );
}
