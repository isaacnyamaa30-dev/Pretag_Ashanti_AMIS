import { PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { getImportedPeriods, comparePeriods, periodSummary } from "@/lib/analytics";
import { executiveSummary } from "@/lib/summary";

export const metadata = { title: "Regional Report - PRETAG AMIS" };

function pct(v: number | null) {
  return v === null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export default async function RegionalReportPage() {
  const periods = await getImportedPeriods();
  if (periods.length === 0) {
    return (
      <>
        <PageHeader title="Regional Report" />
        <p className="text-ink-3 font-mono text-sm">No R20 imported yet.</p>
      </>
    );
  }
  const latest = periods[0];
  const previous = periods[1];
  const summary = await periodSummary(latest.id);
  const rows = previous ? await comparePeriods(previous.id, latest.id) : [];
  const region = rows.find((r) => r.level === "region");
  const zones = rows.filter((r) => r.level === "zone");
  const narrative = previous ? executiveSummary(rows, previous.label, latest.label) : "";

  return (
    <div className="print-report">
      <div className="no-print flex justify-end mb-4">
        <PrintButton />
      </div>

      <header className="mb-6 pb-4 border-b-2 border-primary">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          Pre-Tertiary Teachers Association of Ghana &mdash; Ashanti Region
        </p>
        <h1 className="font-display text-2xl uppercase tracking-tight mt-1">
          Monthly Membership Report &mdash; {latest.label}
        </h1>
        <p className="text-sm text-ink-3 font-mono mt-1">
          Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          {previous && ` · comparison with ${previous.label}`}
        </p>
      </header>

      <section className="mb-6">
        <h2 className="font-display text-sm uppercase tracking-tight mb-2">1. Position</h2>
        <table className="text-sm w-full max-w-md">
          <tbody>
            <tr><td className="py-1 pr-6 text-ink-3">Total members ({latest.label})</td><td className="py-1 text-right font-mono tabular-nums">{summary.region.toLocaleString()}</td></tr>
            {region && (
              <>
                <tr><td className="py-1 pr-6 text-ink-3">Previous ({previous!.label})</td><td className="py-1 text-right font-mono tabular-nums">{region.previous.toLocaleString()}</td></tr>
                <tr><td className="py-1 pr-6 text-ink-3">Added to current R20</td><td className="py-1 text-right font-mono tabular-nums">+{region.added}</td></tr>
                <tr><td className="py-1 pr-6 text-ink-3">Missing from current R20</td><td className="py-1 text-right font-mono tabular-nums">&minus;{region.missing}</td></tr>
                <tr><td className="py-1 pr-6 text-ink-3">Net change</td><td className="py-1 text-right font-mono tabular-nums">{region.net > 0 ? "+" : ""}{region.net}</td></tr>
                <tr><td className="py-1 pr-6 text-ink-3">Growth rate</td><td className="py-1 text-right font-mono tabular-nums">{pct(region.growth_pct)}</td></tr>
                <tr><td className="py-1 pr-6 text-ink-3">Retention rate</td><td className="py-1 text-right font-mono tabular-nums">{region.retention_pct === null ? "n/a" : `${region.retention_pct.toFixed(2)}%`}</td></tr>
              </>
            )}
          </tbody>
        </table>
      </section>

      {narrative && (
        <section className="mb-6">
          <h2 className="font-display text-sm uppercase tracking-tight mb-2">2. Executive summary</h2>
          <p className="text-sm leading-relaxed max-w-prose">{narrative}</p>
        </section>
      )}

      {zones.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-sm uppercase tracking-tight mb-2">3. Zone performance</h2>
          <table className="text-xs w-full border border-border">
            <thead>
              <tr className="bg-surface-2 text-left">
                <th className="px-2 py-1">Zone</th>
                <th className="px-2 py-1 text-right">Prev</th>
                <th className="px-2 py-1 text-right">Curr</th>
                <th className="px-2 py-1 text-right">Net</th>
                <th className="px-2 py-1 text-right">Growth</th>
                <th className="px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {zones.map((z) => (
                <tr key={z.zone_id} className="border-t border-border">
                  <td className="px-2 py-1">{z.name}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{z.previous}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{z.current}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{z.net > 0 ? "+" : ""}{z.net}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{pct(z.growth_pct)}</td>
                  <td className="px-2 py-1">{z.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="mt-10 pt-3 border-t border-border text-[10px] font-mono text-ink-3">
        PRETAG Ashanti Membership Intelligence System &middot; Developed by Isaac Nyamaa Boadi &middot;
        &copy; {new Date().getFullYear()} &middot; Enquiries &amp; services: isaacnyamaa30@gmail.com / +233 24 374 4689 &middot;
        Movement figures describe appearances in the R20, not verified reasons.
      </footer>
    </div>
  );
}
