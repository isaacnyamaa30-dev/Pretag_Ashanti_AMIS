import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getImportedPeriods } from "@/lib/analytics";
import { getDirectoryTree, resolveZonalScope, BULK_EXPORT_ROLES } from "@/lib/r20/zonal-export";
import { PageHeader, Card, StatTile } from "@/components/ui";
import { ZonalDirectory } from "@/components/ZonalDirectory";

export const metadata = { title: "Zonal Membership Export - PRETAG AMIS" };

export default async function ZonalExportPage({
  searchParams,
}: {
  searchParams: { period?: string; denied?: string };
}) {
  const session = await requireUser();
  if (!session.profile) redirect("/dashboard?denied=1");
  const scope = resolveZonalScope(session.profile);
  if (!scope) redirect("/dashboard?denied=1");

  const periods = await getImportedPeriods();
  if (periods.length === 0) {
    return (
      <>
        <PageHeader title="Zonal Membership Export" />
        <p className="text-ink-3 font-mono text-sm">Import an R20 first.</p>
      </>
    );
  }

  const periodId = Number(searchParams.period) || periods[0].id;
  const period = periods.find((p) => p.id === periodId) ?? periods[0];

  const tree = await getDirectoryTree(period.id, period.label, scope);
  const canBulkExport = BULK_EXPORT_ROLES.includes(session.profile.role);

  const scopeNote =
    scope.level === "zone"
      ? "You see your own zone only."
      : scope.level === "district"
        ? "You see your own district only."
        : null;

  return (
    <>
      <PageHeader
        title="Zonal Membership Export"
        sub="Browse the membership directory by zone, district and school - employee no, name, management unit and district - and download any level as Excel or Word."
      />

      {searchParams.denied && (
        <div className="mb-4 border-l-4 border-decline bg-decline-wash rounded px-4 py-3 text-sm">
          That register or summary is outside the area your account is allowed to see.
        </div>
      )}

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">R20 period</span>
            <select name="period" defaultValue={period.id} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <button className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5">
            Show
          </button>
        </form>
        {scope.level === "region" && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[11px] font-mono uppercase tracking-wide text-ink-2 mb-2">Regional summary &middot; {period.label}</div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/exports/zonal/summary?period=${period.id}`}
                className="font-mono text-xs font-bold uppercase tracking-wide bg-primary text-on-primary rounded px-4 py-2"
              >
                <span aria-hidden>&#128202; </span>Regional Summary
              </a>
              <a href={`/api/exports/zonal?period=${period.id}&type=regional-summary`} className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2">
                <span aria-hidden>&#8681; </span>Download Regional Summary — Excel
              </a>
              <a href={`/api/exports/zonal?period=${period.id}&type=regional-summary-docx`} className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2">
                <span aria-hidden>&#8681; </span>Download Regional Summary — Word
              </a>
              <a
                href={`/exports/zonal/summary?period=${period.id}&autoprint=1`}
                target="_blank"
                rel="noopener"
                className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2"
              >
                <span aria-hidden>&#9113; </span>Print Regional Summary
              </a>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatTile value={period.label} label="R20 period" />
        <StatTile value={tree.totalMembers.toLocaleString()} label="total members" />
        <StatTile
          value={tree.zones.length}
          label={scope.level === "region" ? "zones" : scope.level === "zone" ? "zone" : "district"}
        />
      </div>

      {scopeNote && (
        <p className="text-[11px] font-mono text-ink-3 mb-4">{scopeNote}</p>
      )}

      <Card className="mb-6">
        <ZonalDirectory tree={tree} periodId={period.id} canBulkExport={canBulkExport} />
      </Card>

      {canBulkExport && (
        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-2">Download all 18 zones</h3>
          <p className="text-sm text-ink-2 mb-3">
            One ZIP with a folder per zone (all 18, even an empty one), each containing that zone&rsquo;s
            membership register for {period.label} in the format(s) you choose.
          </p>
          <form action="/api/exports/zonal" method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="type" value="all" />
            <input type="hidden" name="period" value={period.id} />
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Format</span>
              <select name="format" defaultValue="both" className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
                <option value="xlsx">Excel only (.xlsx)</option>
                <option value="docx">Word only (.docx)</option>
                <option value="both">Both Excel and Word</option>
              </select>
            </label>
            <button className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2">
              <span aria-hidden>&#8681; </span>Download All 18 Zones
            </button>
          </form>
          <p className="text-[11px] font-mono text-ink-3 mt-2">
            This builds all 18 zones at once and can take a little while to download - please wait for it
            to finish rather than clicking again.
          </p>
        </Card>
      )}
    </>
  );
}
