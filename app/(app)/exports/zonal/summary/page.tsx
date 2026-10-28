import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getImportedPeriods } from "@/lib/analytics";
import { resolveZonalScope } from "@/lib/r20/zonal-export";
import { getRegionalSummary } from "@/lib/r20/regional-summary";
import { PageHeader, Card, StatTile } from "@/components/ui";
import { PrintToolbar, PrintPageStyle } from "@/components/PrintToolbar";

export const metadata = { title: "Regional Membership Summary - PRETAG AMIS" };
export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-GB");

export default async function RegionalSummaryPage({
  searchParams,
}: {
  searchParams: { period?: string; autoprint?: string };
}) {
  const session = await requireUser();
  if (!session.profile) redirect("/dashboard?denied=1");
  const scope = resolveZonalScope(session.profile);
  // the regional summary covers every zone, so it is for region-wide roles only
  if (!scope || scope.level !== "region") redirect("/exports/zonal?denied=1");

  const periods = await getImportedPeriods();
  if (periods.length === 0) redirect("/exports/zonal");
  const period = periods.find((p) => p.id === Number(searchParams.period)) ?? periods[0];
  const s = await getRegionalSummary(period.id, period.label);
  const c = s.checks;
  const clean = c.regionEqualsZones && c.zonesEqualDistricts && !c.unmappedRows && !c.duplicateEmployeeNos && !c.zoneMismatches.length;
  const dl = (type: string) => `/api/exports/zonal?period=${period.id}&type=${type}`;

  return (
    <div className="print-doc">
      <PrintPageStyle landscape={false} footer={`PRETAG Ashanti Region · Regional Membership Summary · R20 Period: ${period.label}`} />
      <div className="no-print">
        <PageHeader
          title="Regional Membership Summary"
          sub="Total PRETAG membership for all 18 zones and every district, from the approved R20 of the selected period."
        />
        <Card className="mb-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">R20 period</span>
              <select name="period" defaultValue={period.id} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <button className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5">Show</button>
          </form>
          <div className="flex flex-wrap gap-2 mt-4">
            <a href={dl("regional-summary")} className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2">
              <span aria-hidden>&#8681; </span>Download Regional Summary — Excel
            </a>
            <a href={dl("regional-summary-docx")} className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2">
              <span aria-hidden>&#8681; </span>Download Regional Summary — Word
            </a>
          </div>
        </Card>
      </div>
      <PrintToolbar autoPrint={searchParams.autoprint === "1"} backHref={`/exports/zonal?period=${period.id}`} />

      {/* printed report starts here */}
      <div className="flex items-center gap-4 border-b-2 border-[#c4161c] pb-3 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/pretag-emblem.jpg" alt="PRETAG" width={56} height={56} className="rounded-full" />
        <div>
          <div className="font-display text-xl font-extrabold uppercase text-[#c4161c] leading-tight">PRETAG Ashanti Region</div>
          <div className="font-display text-base font-extrabold uppercase leading-tight">Regional Membership Summary</div>
          <div className="font-mono text-sm font-bold">R20 PERIOD: {period.label.toUpperCase()}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 keep">
        <StatTile value={fmt(s.totalMembers)} label="total regional membership" />
        <StatTile value={s.totalZones} label="total zones" />
        <StatTile value={s.configuredDistricts} label="districts (configured)" />
        <StatTile value={s.districtsWithMembers} label="districts with members in this R20" />
      </div>

      <div className={`no-print mb-5 rounded px-4 py-3 text-sm border-l-4 ${clean ? "border-grow bg-grow-wash" : "border-stable bg-stable-wash"}`}>
        <div className="font-bold mb-1">{clean ? "All accuracy checks passed" : "Accuracy checks: please review"}</div>
        <ul className="font-mono text-xs space-y-0.5">
          <li>{c.regionEqualsZones ? "✔" : "✖"} Regional total ({fmt(s.totalMembers)}) = sum of the {s.totalZones} zone totals</li>
          <li>{c.zonesEqualDistricts ? "✔" : "✖"} Every zone total = sum of its district totals</li>
          <li>{c.duplicateEmployeeNos ? `✖ ${c.duplicateEmployeeNos} employee number(s) appear more than once (counted once)` : "✔ No member is counted twice"}</li>
          <li>{c.unmappedRows ? `✖ ${c.unmappedRows} record(s) have no zone / district and are excluded` : "✔ Every record is assigned to a zone and district"}</li>
          {c.zoneMismatches.length === 0 ? (
            <li>✔ Every record&rsquo;s zone matches its district&rsquo;s current zone</li>
          ) : (
            c.zoneMismatches.map((m) => (
              <li key={m.district + m.snapshotZone}>
                ✖ {m.members} member(s) of {m.district} were imported under {m.snapshotZone}; the district now belongs to{" "}
                {m.currentZone} and they are counted there
              </li>
            ))
          )}
        </ul>
      </div>

      <h2 className="font-display text-sm uppercase tracking-tight mb-2">Summary of all zones</h2>
      <div className="overflow-x-auto mb-6 keep">
        <table className="w-full text-sm font-mono border border-border min-w-[480px]">
          <thead>
            <tr className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
              <th className="text-right px-3 py-2 w-14">No.</th>
              <th className="text-left px-3 py-2">Zone</th>
              <th className="text-right px-3 py-2">Number of districts</th>
              <th className="text-right px-3 py-2">Total members</th>
            </tr>
          </thead>
          <tbody>
            {s.zones.map((z, i) => (
              <tr key={z.id} className="border-t border-border">
                <td className="px-3 py-1.5 text-right tabular-nums">{i + 1}</td>
                <td className="px-3 py-1.5">
                  <a href={`#zone-${z.id}`} className="underline print:no-underline">{z.name}</a>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{z.districts.length}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmt(z.members)}</td>
              </tr>
            ))}
            <tr className="total-row border-t-2 border-border-strong bg-surface-2 font-bold">
              <td />
              <td className="px-3 py-2">REGIONAL TOTAL</td>
              <td className="px-3 py-2 text-right tabular-nums">{s.configuredDistricts}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmt(s.totalMembers)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="font-display text-sm uppercase tracking-tight mb-2 print:break-before-page">District membership breakdown</h2>
      <div className="grid md:grid-cols-2 gap-4 print:block">
        {s.zones.map((z) => (
          <section key={z.id} id={`zone-${z.id}`} className="keep border border-border rounded p-3 bg-surface print:mb-3 print:bg-white">
            <h3 className="font-display text-sm uppercase tracking-tight text-primary mb-2">Zone: {z.name}</h3>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="bg-primary text-on-primary uppercase tracking-wide">
                  <th className="text-right px-2 py-1 w-10">No.</th>
                  <th className="text-left px-2 py-1">District</th>
                  <th className="text-right px-2 py-1">Total members</th>
                </tr>
              </thead>
              <tbody>
                {z.districts.map((d, i) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-2 py-1 text-right tabular-nums">{i + 1}</td>
                    <td className="px-2 py-1">{d.name}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmt(d.members)}</td>
                  </tr>
                ))}
                <tr className="total-row border-t-2 border-border-strong bg-surface-2 font-bold">
                  <td />
                  <td className="px-2 py-1.5 uppercase">{z.name} zone total</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{fmt(z.members)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <p className="mt-5 font-mono text-sm font-bold">
        REGIONAL GRAND TOTAL: {fmt(s.totalMembers)} members across {s.totalZones} zones and {s.districtsWithMembers} districts ({period.label}).
      </p>
    </div>
  );
}
