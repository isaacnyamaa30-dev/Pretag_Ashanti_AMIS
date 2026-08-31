import { PageHeader, Card, StatTile } from "@/components/ui";
import { CompareTable } from "@/components/CompareTable";
import { getImportedPeriods, comparePeriods } from "@/lib/analytics";

export const metadata = { title: "Monthly Comparison - PRETAG AMIS" };

export default async function MonthlyComparePage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const periods = await getImportedPeriods();

  if (periods.length < 2) {
    return (
      <>
        <PageHeader title="Compare Months" />
        <p className="text-ink-3 font-mono text-sm">
          You need at least two imported R20s to compare. {periods.length} imported so far.
        </p>
      </>
    );
  }

  const toId = Number(searchParams.to) || periods[0].id;
  const fromId = Number(searchParams.from) || periods[1].id;
  const from = periods.find((p) => p.id === fromId) ?? periods[1];
  const to = periods.find((p) => p.id === toId) ?? periods[0];

  const rows = fromId !== toId ? await comparePeriods(fromId, toId) : [];
  const region = rows.find((r) => r.level === "region");

  return (
    <>
      <PageHeader title="Compare Months" />

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">From</span>
            <select name="from" defaultValue={fromId} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">To</span>
            <select name="to" defaultValue={toId} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <button className="font-mono text-xs uppercase tracking-wide bg-primary text-on-primary rounded px-3 py-1.5">
            Compare
          </button>
        </form>
      </Card>

      {fromId === toId ? (
        <p className="text-ink-3 font-mono text-sm">Pick two different months.</p>
      ) : region ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatTile value={region.previous.toLocaleString()} label={`${from.label}`} />
            <StatTile value={region.current.toLocaleString()} label={`${to.label}`} />
            <StatTile value={`+${region.added}`} label="added" />
            <StatTile value={`-${region.missing}`} label="missing" />
            <StatTile value={`${region.net > 0 ? "+" : ""}${region.net}`} label="net change" />
            <StatTile
              value={region.growth_pct === null ? "n/a" : `${region.growth_pct > 0 ? "+" : ""}${region.growth_pct}%`}
              label="growth"
            />
          </div>
          <CompareTable rows={rows} linkZones />
        </>
      ) : null}
    </>
  );
}
