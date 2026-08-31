import { PageHeader, Card, StatTile } from "@/components/ui";
import { TrendChart } from "@/components/charts/TrendChart";
import { membershipSeries, comparePeriods } from "@/lib/analytics";

export const metadata = { title: "Multi-Month Analysis - PRETAG AMIS" };

export default async function MultiMonthPage() {
  const series = await membershipSeries();

  if (series.length < 2) {
    return (
      <>
        <PageHeader title="Multi-Month Analysis" />
        <p className="text-ink-3 font-mono text-sm">
          Import at least two months. {series.length} imported.
        </p>
      </>
    );
  }

  // month-on-month steps
  const steps: { from: string; to: string; net: number; pct: number | null }[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].members;
    const cur = series[i].members;
    steps.push({
      from: series[i - 1].label,
      to: series[i].label,
      net: cur - prev,
      pct: prev === 0 ? null : Math.round(((cur - prev) / prev) * 10000) / 100,
    });
  }

  const first = series[0];
  const last = series[series.length - 1];
  const overallNet = last.members - first.members;
  const overallPct = first.members === 0 ? null : Math.round((overallNet / first.members) * 10000) / 100;

  const best = steps.reduce((a, b) => (b.net > a.net ? b : a));
  const worst = steps.reduce((a, b) => (b.net < a.net ? b : a));

  // overall zone movement first -> last
  const zoneRows = (await comparePeriods(first.periodId ?? series[0].periodId, last.periodId))
    .filter((r) => r.level === "zone")
    .sort((a, b) => b.net - a.net);

  return (
    <>
      <PageHeader title="Multi-Month Analysis" sub={`${first.label} to ${last.label}`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile value={first.members.toLocaleString()} label={first.label} />
        <StatTile value={last.members.toLocaleString()} label={last.label} />
        <StatTile value={`${overallNet > 0 ? "+" : ""}${overallNet}`} label="overall net" />
        <StatTile
          value={overallPct === null ? "n/a" : `${overallPct > 0 ? "+" : ""}${overallPct}%`}
          label="overall growth"
        />
      </div>

      <Card className="mb-6">
        <h3 className="font-display text-sm uppercase tracking-tight mb-2">Membership trend</h3>
        <TrendChart data={series.map((s) => ({ label: s.label, members: s.members }))} />
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-3">Month on month</h3>
          <table className="w-full text-sm font-mono">
            <tbody>
              {steps.map((s) => (
                <tr key={s.to} className="border-b border-border last:border-0">
                  <td className="py-1.5">{s.from} &rarr; {s.to}</td>
                  <td className={`py-1.5 text-right tabular-nums ${s.net > 0 ? "text-grow" : s.net < 0 ? "text-decline" : ""}`}>
                    {s.net > 0 ? "+" : ""}{s.net}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-ink-3">
                    {s.pct === null ? "n/a" : `${s.pct > 0 ? "+" : ""}${s.pct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs font-mono text-ink-3 mt-3">
            Best month: {best.to} ({best.net > 0 ? "+" : ""}{best.net}) &middot; Worst: {worst.to} ({worst.net})
          </p>
        </Card>

        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-3">
            Zone change over the whole period
          </h3>
          <table className="w-full text-sm font-mono">
            <tbody>
              {zoneRows.map((z) => (
                <tr key={z.zone_id} className="border-b border-border last:border-0">
                  <td className="py-1.5">{z.name}</td>
                  <td className={`py-1.5 text-right tabular-nums ${z.net > 0 ? "text-grow" : z.net < 0 ? "text-decline" : ""}`}>
                    {z.net > 0 ? "+" : ""}{z.net}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
