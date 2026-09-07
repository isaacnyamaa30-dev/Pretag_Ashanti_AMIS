import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { getImportedPeriods } from "@/lib/analytics";
import { resolveRange, buildExecutiveReport } from "@/lib/reports";

export const metadata = { title: "Executive Report - PRETAG AMIS" };

const PRESETS = [
  { key: "latest-quarter", label: "Latest quarter" },
  { key: "half-year", label: "Half year" },
  { key: "year-to-date", label: "Year to date" },
  { key: "all-time", label: "All imported months" },
] as const;

function pct(v: number | null) {
  return v === null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}
function signed(n: number) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;
}

export default async function ExecutiveReportPage({
  searchParams,
}: {
  searchParams: { preset?: string; from?: string; to?: string };
}) {
  const periods = await getImportedPeriods();

  if (periods.length < 2) {
    return (
      <>
        <PageHeader title="Executive Report" sub="Quarterly / half-year / annual report for REC and NEC." />
        <p className="text-ink-3 font-mono text-sm">
          This report needs at least two imported months. {periods.length} R20
          {periods.length === 1 ? " has" : "s have"} been imported so far.
        </p>
      </>
    );
  }

  const preset = searchParams.preset ?? "latest-quarter";
  const { fromId, toId } = resolveRange(periods, {
    preset,
    from: Number(searchParams.from) || undefined,
    to: Number(searchParams.to) || undefined,
  });
  const report = await buildExecutiveReport(periods, fromId, toId);
  const { region, zones, steps, best, worst } = report;

  const generated = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const isCustom = !PRESETS.some((p) => p.key === preset) || !!(searchParams.from && searchParams.to);
  const docHref = `/api/exports?type=executive&from=${report.from.id}&to=${report.to.id}`;

  return (
    <div className="print-report">
      {/* controls - not printed */}
      <div className="no-print mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-3">Period</span>
          {PRESETS.map((p) => (
            <Link
              key={p.key}
              href={`/reports/executive?preset=${p.key}`}
              data-active={preset === p.key && !isCustom ? "true" : undefined}
              className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5 data-[active=true]:bg-primary data-[active=true]:text-on-primary"
            >
              {p.label}
            </Link>
          ))}
        </div>

        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="preset" value="custom" />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Opening month</span>
            <select
              name="from"
              defaultValue={report.from.id}
              className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm"
            >
              {[...periods].reverse().map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Closing month</span>
            <select
              name="to"
              defaultValue={report.to.id}
              className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm"
            >
              {[...periods].reverse().map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <button className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5">
            Show
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <PrintButton />
          <a
            href={docHref}
            className="font-mono text-xs uppercase tracking-wide bg-primary text-on-primary rounded px-3 py-2"
          >
            &#8681; Download as Word
          </a>
        </div>
      </div>

      {report.from.id === report.to.id ? (
        <p className="text-decline font-mono text-sm">
          The opening and closing month are the same. Pick two different months.
        </p>
      ) : (
        <>
          <header className="mb-6 pb-4 border-b-2 border-primary">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
              Pre-Tertiary Teachers Association of Ghana &mdash; Ashanti Region
            </p>
            <h1 className="font-display text-2xl uppercase tracking-tight mt-1">
              Membership Report &mdash; {report.name}
            </h1>
            <p className="text-sm text-ink-3 font-mono mt-1">
              Prepared for the Regional / National Executive Council &middot; covering {report.span}
              {" "}&middot; generated {generated}
            </p>
          </header>

          <section className="mb-6">
            <h2 className="font-display text-sm uppercase tracking-tight mb-2">1. Position</h2>
            {region ? (
              <div className="overflow-x-auto">
                <table className="text-sm w-full max-w-md">
                  <tbody>
                    <tr><td className="py-1 pr-6 text-ink-3">Opening membership ({report.from.label})</td><td className="py-1 text-right font-mono tabular-nums">{region.previous.toLocaleString()}</td></tr>
                    <tr><td className="py-1 pr-6 text-ink-3">Closing membership ({report.to.label})</td><td className="py-1 text-right font-mono tabular-nums">{region.current.toLocaleString()}</td></tr>
                    <tr><td className="py-1 pr-6 text-ink-3">Joined over the period</td><td className="py-1 text-right font-mono tabular-nums">+{region.added.toLocaleString()}</td></tr>
                    <tr><td className="py-1 pr-6 text-ink-3">Left over the period</td><td className="py-1 text-right font-mono tabular-nums">&minus;{region.missing.toLocaleString()}</td></tr>
                    <tr><td className="py-1 pr-6 text-ink-3">Net change</td><td className="py-1 text-right font-mono tabular-nums font-bold">{signed(region.net)}</td></tr>
                    <tr><td className="py-1 pr-6 text-ink-3">Growth rate</td><td className="py-1 text-right font-mono tabular-nums">{pct(region.growth_pct)}</td></tr>
                    <tr><td className="py-1 pr-6 text-ink-3">Retention rate</td><td className="py-1 text-right font-mono tabular-nums">{region.retention_pct === null ? "n/a" : `${region.retention_pct.toFixed(2)}%`}</td></tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-ink-3 text-sm">No regional figure for this range.</p>
            )}
          </section>

          {report.summary && (
            <section className="mb-6">
              <h2 className="font-display text-sm uppercase tracking-tight mb-2">2. Executive summary</h2>
              <p className="text-sm leading-relaxed max-w-prose">{report.summary}</p>
              {report.trajectory && (
                <p className="text-sm leading-relaxed max-w-prose mt-2">{report.trajectory}</p>
              )}
            </section>
          )}

          {steps.length > 0 && (
            <section className="mb-6">
              <h2 className="font-display text-sm uppercase tracking-tight mb-2">3. Month by month</h2>
              <div className="overflow-x-auto">
                <table className="text-xs w-full min-w-[360px] border border-border font-mono">
                  <thead>
                    <tr className="bg-surface-2 text-left">
                      <th className="px-2 py-1">Step</th>
                      <th className="px-2 py-1 text-right">Net change</th>
                      <th className="px-2 py-1 text-right">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((s) => (
                      <tr key={s.to} className="border-t border-border">
                        <td className="px-2 py-1">{s.from} &rarr; {s.to}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{signed(s.net)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{pct(s.pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {best && worst && steps.length >= 2 && (
                <p className="text-xs font-mono text-ink-3 mt-2">
                  Strongest month: {best.to} ({signed(best.net)}) &middot; Weakest: {worst.to} ({signed(worst.net)})
                </p>
              )}
            </section>
          )}

          {zones.length > 0 && (
            <section className="mb-6">
              <h2 className="font-display text-sm uppercase tracking-tight mb-2">4. Zone performance</h2>
              <div className="overflow-x-auto">
                <table className="text-xs w-full min-w-[420px] border border-border">
                  <thead>
                    <tr className="bg-surface-2 text-left">
                      <th className="px-2 py-1">Zone</th>
                      <th className="px-2 py-1 text-right">Opening</th>
                      <th className="px-2 py-1 text-right">Closing</th>
                      <th className="px-2 py-1 text-right">Net</th>
                      <th className="px-2 py-1 text-right">Growth</th>
                      <th className="px-2 py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {zones.map((z) => (
                      <tr key={z.zone_id} className="border-t border-border">
                        <td className="px-2 py-1">{z.name}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{z.previous.toLocaleString()}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{z.current.toLocaleString()}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{signed(z.net)}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{pct(z.growth_pct)}</td>
                        <td className="px-2 py-1 capitalize">{z.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(report.risingDistricts.length > 0 || report.fallingDistricts.length > 0) && (
            <section className="mb-6">
              <h2 className="font-display text-sm uppercase tracking-tight mb-2">5. Districts of note</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-display text-xs uppercase tracking-tight mb-1.5 text-grow">Largest gains</h3>
                  <ul className="text-xs font-mono space-y-0.5">
                    {report.risingDistricts.map((d) => (
                      <li key={d.district_id} className="flex justify-between gap-3">
                        <span>{d.name} <span className="text-ink-3">({d.zone_name})</span></span>
                        <span className="tabular-nums text-grow">{signed(d.net)}</span>
                      </li>
                    ))}
                    {report.risingDistricts.length === 0 && <li className="text-ink-3">None</li>}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-xs uppercase tracking-tight mb-1.5 text-decline">Largest losses</h3>
                  <ul className="text-xs font-mono space-y-0.5">
                    {report.fallingDistricts.map((d) => (
                      <li key={d.district_id} className="flex justify-between gap-3">
                        <span>{d.name} <span className="text-ink-3">({d.zone_name})</span></span>
                        <span className="tabular-nums text-decline">{signed(d.net)}</span>
                      </li>
                    ))}
                    {report.fallingDistricts.length === 0 && <li className="text-ink-3">None</li>}
                  </ul>
                </div>
              </div>
            </section>
          )}

          <footer className="mt-10 pt-3 border-t border-border text-[10px] font-mono text-ink-3">
            Covers {report.monthsCovered} imported month{report.monthsCovered === 1 ? "" : "s"} ({report.span}).
            Movement figures describe appearances in the monthly R20 return, not verified reasons for joining or leaving.
            {" "}PRETAG Ashanti Membership Intelligence System &middot; Developed by Saris IT Solution &middot;
            &copy; {new Date().getFullYear()} &middot; sarisitsolution@gmail.com / +233 24 117 6269.
          </footer>
        </>
      )}
    </div>
  );
}
