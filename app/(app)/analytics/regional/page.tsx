import { PageHeader, Card, StatTile } from "@/components/ui";
import { CompareTable } from "@/components/CompareTable";
import { CopyText } from "@/components/CopyText";
import { getImportedPeriods, comparePeriods, periodSummary, statusClasses } from "@/lib/analytics";
import { executiveSummary } from "@/lib/summary";

export const metadata = { title: "Regional Analysis - PRETAG AMIS" };

export default async function RegionalPage() {
  const periods = await getImportedPeriods();

  if (periods.length === 0) {
    return (
      <>
        <PageHeader title="Regional Analysis" />
        <p className="text-ink-3 font-mono text-sm">
          No R20 has been imported yet. Import one from R20 Centre first.
        </p>
      </>
    );
  }

  const latest = periods[0];
  const previous = periods[1];
  const summary = await periodSummary(latest.id);

  if (!previous) {
    return (
      <>
        <PageHeader
          title="Regional Analysis"
          sub={`${latest.label} - the first imported period. Import a second month to see gains, losses and growth.`}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatTile value={summary.region.toLocaleString()} label="total members" />
          <StatTile value={summary.zones.length} label="zones with members" />
          <StatTile value={summary.zones[0]?.name ?? "-"} label="largest zone" />
          <StatTile value={summary.zones[0]?.members.toLocaleString() ?? "-"} label="its members" />
        </div>
        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-3">Members by zone - {latest.label}</h3>
          <div className="flex flex-col gap-1.5">
            {summary.zones.map((z) => {
              const max = summary.zones[0]?.members || 1;
              return (
                <div key={z.zoneId} className="flex items-center gap-3 text-sm font-mono">
                  <span className="w-40 shrink-0 truncate text-ink-2">{z.name}</span>
                  <span className="flex-1 h-2.5 rounded-full bg-surface-2 overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-primary/70"
                      style={{ width: `${Math.max(3, (z.members / max) * 100)}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right tabular-nums text-ink">{z.members}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </>
    );
  }

  const rows = await comparePeriods(previous.id, latest.id);
  const region = rows.find((r) => r.level === "region")!;
  const growing = rows.filter((r) => r.level === "zone" && r.status === "growing").length;
  const stable = rows.filter((r) => r.level === "zone" && r.status === "stable").length;
  const declining = rows.filter((r) => r.level === "zone" && r.status === "declining").length;
  const execText = executiveSummary(rows, previous.label, latest.label);

  return (
    <>
      <PageHeader
        title="Regional Analysis"
        sub={`${previous.label} to ${latest.label}`}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <StatTile value={region.previous.toLocaleString()} label={`${previous.label} members`} />
        <StatTile value={region.current.toLocaleString()} label={`${latest.label} members`} />
        <StatTile value={`+${region.added}`} label="added to current R20" />
        <StatTile value={`-${region.missing}`} label="missing from current R20" />
        <StatTile value={`${region.net > 0 ? "+" : ""}${region.net}`} label="net change" />
        <StatTile
          value={region.growth_pct === null ? "n/a" : `${region.growth_pct > 0 ? "+" : ""}${region.growth_pct}%`}
          label="growth rate"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-8 text-xs font-mono">
        <span className={`px-2.5 py-1 rounded-full ${statusClasses("growing")}`}>{growing} growing</span>
        <span className={`px-2.5 py-1 rounded-full ${statusClasses("stable")}`}>{stable} stable</span>
        <span className={`px-2.5 py-1 rounded-full ${statusClasses("declining")}`}>{declining} declining</span>
        <span className="px-2.5 py-1 rounded-full bg-surface-2 text-ink-3">
          retention {region.retention_pct === null ? "n/a" : `${region.retention_pct}%`}
        </span>
      </div>

      <Card className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-display text-sm uppercase tracking-tight">Executive summary</h3>
          <CopyText text={execText} />
        </div>
        <p className="text-ink-2 leading-relaxed max-w-prose">{execText}</p>
        <p className="text-[11px] font-mono text-ink-3 mt-3">
          Generated from the figures above. Describes movement in and out of the R20 - not verified
          reasons for it.
        </p>
      </Card>

      <h3 className="font-display text-sm uppercase tracking-tight mb-2">Zone performance</h3>
      <CompareTable rows={rows} linkZones />
    </>
  );
}
