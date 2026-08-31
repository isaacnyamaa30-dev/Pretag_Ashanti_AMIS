import Link from "next/link";
import { PageHeader, Card, StatTile } from "@/components/ui";
import {
  getImportedPeriods,
  periodSummary,
  comparePeriods,
  getMembershipTrend,
  statusClasses,
} from "@/lib/analytics";
import { TrendChart } from "@/components/charts/TrendChart";
import { ZoneGrowthChart } from "@/components/charts/ZoneGrowthChart";

export const metadata = { title: "Dashboard - PRETAG AMIS" };

export default async function DashboardPage() {
  const periods = await getImportedPeriods();

  if (periods.length === 0) {
    return (
      <>
        <PageHeader
          title="Regional Dashboard"
          sub="Membership figures appear once the first R20 is imported."
        />
        <Card>
          <p className="text-ink-2">
            The organisational structure is loaded. Import the first monthly Regional R20 from{" "}
            <Link href="/r20/upload" className="underline font-mono">
              R20 Centre &rarr; Upload R20
            </Link>{" "}
            to populate figures.
          </p>
        </Card>
      </>
    );
  }

  const latest = periods[0];
  const previous = periods[1];
  const summary = await periodSummary(latest.id);

  const [compare, trend] = await Promise.all([
    previous ? comparePeriods(previous.id, latest.id) : Promise.resolve([]),
    getMembershipTrend(),
  ]);
  const region = compare.find((r) => r.level === "region");
  const zoneRows = compare.filter((r) => r.level === "zone");
  const counts = {
    growing: zoneRows.filter((r) => r.status === "growing").length,
    stable: zoneRows.filter((r) => r.status === "stable").length,
    declining: zoneRows.filter((r) => r.status === "declining").length,
  };

  return (
    <>
      <PageHeader
        title="Regional Dashboard"
        sub={previous ? `${previous.label} to ${latest.label}` : `${latest.label} - first imported period`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile value={summary.region.toLocaleString()} label={`members (${latest.label})`} />
        {region ? (
          <>
            <StatTile value={region.previous.toLocaleString()} label={`previous (${previous!.label})`} />
            <StatTile
              value={`${region.net > 0 ? "+" : ""}${region.net}`}
              label="net change"
            />
            <StatTile
              value={
                region.growth_pct === null
                  ? "n/a"
                  : `${region.growth_pct > 0 ? "+" : ""}${region.growth_pct}%`
              }
              label="growth rate"
            />
          </>
        ) : (
          <>
            <StatTile value={summary.zones.length} label="zones with members" />
            <StatTile value={summary.zones[0]?.name ?? "-"} label="largest zone" />
            <StatTile value={periods.length} label="periods imported" />
          </>
        )}
      </div>

      {region && (
        <div className="flex flex-wrap gap-2 mb-8 text-xs font-mono">
          <span className={`px-2.5 py-1 rounded-full ${statusClasses("growing")}`}>{counts.growing} growing</span>
          <span className={`px-2.5 py-1 rounded-full ${statusClasses("stable")}`}>{counts.stable} stable</span>
          <span className={`px-2.5 py-1 rounded-full ${statusClasses("declining")}`}>{counts.declining} declining</span>
          <span className="px-2.5 py-1 rounded-full bg-surface-2 text-ink-3">
            +{region.added} added &middot; -{region.missing} missing &middot; retention {region.retention_pct}%
          </span>
        </div>
      )}

      {trend.length >= 2 && (
        <Card className="mb-4">
          <h3 className="font-display text-sm uppercase tracking-tight mb-2">Membership trend</h3>
          <TrendChart data={trend} />
        </Card>
      )}

      {zoneRows.length > 0 && (
        <Card className="mb-4">
          <h3 className="font-display text-sm uppercase tracking-tight mb-2">
            Zone net change - {previous!.label} to {latest.label}
          </h3>
          <ZoneGrowthChart data={zoneRows.map((r) => ({ name: r.name, net: r.net }))} />
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-3">Members by zone - {latest.label}</h3>
          <div className="flex flex-col gap-1">
            {summary.zones.slice(0, 8).map((z) => {
              const max = summary.zones[0]?.members || 1;
              return (
                <div key={z.zoneId} className="flex items-center gap-2 text-sm font-mono">
                  <span className="w-36 truncate text-ink-2">{z.name}</span>
                  <span className="h-2 rounded-full bg-primary/60" style={{ width: `${(z.members / max) * 150}px` }} />
                  <span className="tabular-nums text-ink-3">{z.members}</span>
                </div>
              );
            })}
          </div>
          <Link href="/analytics/zones" className="text-xs font-mono underline text-ink-3 hover:text-primary mt-3 inline-block">
            All zones &rarr;
          </Link>
        </Card>

        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-3">Next</h3>
          <p className="text-ink-2 text-sm">
            {previous ? (
              <>
                See the full zone ranking and drill into districts in{" "}
                <Link href="/analytics/regional" className="underline">Regional Analysis</Link>, or compare any two
                months in <Link href="/compare/monthly" className="underline">Compare</Link>.
              </>
            ) : (
              <>
                Import a second month to unlock gains, losses, growth rates and zone rankings. Upload from{" "}
                <Link href="/r20/upload" className="underline">R20 Centre</Link>.
              </>
            )}
          </p>
        </Card>
      </div>
    </>
  );
}
