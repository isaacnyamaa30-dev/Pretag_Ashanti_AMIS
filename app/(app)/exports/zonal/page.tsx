import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getImportedPeriods } from "@/lib/analytics";
import { getZoneRegister, BULK_EXPORT_ROLES } from "@/lib/r20/zonal-export";
import { PageHeader, Card, StatTile } from "@/components/ui";
import { ZonalMembersTable } from "@/components/ZonalMembersTable";

export const metadata = { title: "Zonal Membership Export - PRETAG AMIS" };

export default async function ZonalExportPage({
  searchParams,
}: {
  searchParams: { zone?: string; period?: string };
}) {
  const session = await requireStaff();
  const periods = await getImportedPeriods();

  if (periods.length === 0) {
    return (
      <>
        <PageHeader title="Zonal Membership Export" />
        <p className="text-ink-3 font-mono text-sm">Import an R20 first.</p>
      </>
    );
  }

  const supabase = createClient();
  const { data: zones } = await supabase.from("zones").select("id, zone_name").order("zone_name");
  if (!zones || zones.length === 0) {
    return (
      <>
        <PageHeader title="Zonal Membership Export" />
        <p className="text-ink-3 font-mono text-sm">No zones configured.</p>
      </>
    );
  }

  const periodId = Number(searchParams.period) || periods[0].id;
  const period = periods.find((p) => p.id === periodId) ?? periods[0];
  const zoneId = Number(searchParams.zone) || zones[0].id;
  const zone = zones.find((z) => z.id === zoneId) ?? zones[0];

  const register = await getZoneRegister(period.id, zone.id, period.label);
  const canBulkExport = BULK_EXPORT_ROLES.includes(session.profile.role);

  const downloadLink = (type: "xlsx" | "docx") =>
    `/api/exports/zonal?period=${period.id}&zone=${zone.id}&type=${type}`;

  return (
    <>
      <PageHeader
        title="Zonal Membership Export"
        sub="Download a zone's membership register - employee no, name, management unit and district - organised by district."
      />

      <Card className="mb-6">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Zone</span>
            <select name="zone" defaultValue={zone.id} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm min-w-[200px]">
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.zone_name}</option>
              ))}
            </select>
          </label>
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
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile value={zone.zone_name} label="zone" />
        <StatTile value={period.label} label="R20 period" />
        <StatTile value={register.members.length.toLocaleString()} label="total members" />
        <StatTile value={register.districts.length} label="districts" />
      </div>

      <Card className="mb-6">
        <h3 className="font-display text-sm uppercase tracking-tight mb-3">Membership per district</h3>
        <div className="flex flex-wrap gap-2">
          {register.districts.map((d) => (
            <span key={d.name} className="font-mono text-xs px-2.5 py-1 rounded-full bg-surface-2 text-ink-2">
              {d.name}: {d.count}
            </span>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-sm uppercase tracking-tight">Download this zone</h3>
          <div className="flex flex-wrap gap-2">
            <a href={downloadLink("xlsx")} className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2">
              <span aria-hidden>&#8681; </span>Download Excel (.xlsx)
            </a>
            <a href={downloadLink("docx")} className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2">
              <span aria-hidden>&#8681; </span>Download Word (.docx)
            </a>
          </div>
        </div>

        <ZonalMembersTable members={register.members} districts={register.districts.map((d) => d.name)} />
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
