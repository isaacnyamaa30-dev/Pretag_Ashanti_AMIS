import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { getImportedPeriods } from "@/lib/analytics";

export const metadata = { title: "Export Centre - PRETAG AMIS" };

export default async function ExportsPage({ searchParams }: { searchParams: { period?: string } }) {
  await requireStaff();
  const periods = await getImportedPeriods();

  if (periods.length === 0) {
    return (
      <>
        <PageHeader title="Export Centre" />
        <p className="text-ink-3 font-mono text-sm">Import an R20 first.</p>
      </>
    );
  }

  const periodId = Number(searchParams.period) || periods[0].id;
  const period = periods.find((p) => p.id === periodId) ?? periods[0];

  const supabase = createClient();
  const { data: zones } = await supabase.from("zones").select("id, zone_name").order("zone_name");

  const link = (type: string, extra = "") =>
    `/api/exports?period=${period.id}&type=${type}${extra}`;

  return (
    <>
      <PageHeader
        title="Export Centre"
        sub="Regenerate the Regional and per-zone R20 workbooks for any imported month."
      />

      <Card className="mb-6">
        <form method="get" className="flex items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Month</span>
            <select name="period" defaultValue={period.id} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <button className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5">
            Change
          </button>
        </form>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-2">Regional</h3>
          <p className="text-sm text-ink-2 mb-3">One workbook, every member for {period.label}.</p>
          <a href={link("regional")} className="inline-block font-mono text-xs uppercase tracking-wide bg-primary text-on-primary rounded px-3 py-2">
            Download Regional R20
          </a>
        </Card>
        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-2">All 18 zones</h3>
          <p className="text-sm text-ink-2 mb-3">
            A ZIP with a workbook per zone (one sheet per district) plus the Regional file.
          </p>
          <a href={link("zip")} className="inline-block font-mono text-xs uppercase tracking-wide bg-primary text-on-primary rounded px-3 py-2">
            Download all zones (ZIP)
          </a>
        </Card>
      </div>

      {periods.length >= 2 && (
        <Card className="mb-8">
          <h3 className="font-display text-sm uppercase tracking-tight mb-2">Comparison report</h3>
          <p className="text-sm text-ink-2 mb-3">
            Regional, zone, district and member-level movement between two months, as one workbook.
          </p>
          <form action="/api/exports" method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="type" value="comparison" />
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">From</span>
              <select name="from" defaultValue={periods[1].id} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
                {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">To</span>
              <select name="to" defaultValue={periods[0].id} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm">
                {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <button className="font-mono text-xs uppercase tracking-wide bg-primary text-on-primary rounded px-3 py-2">
              Download comparison
            </button>
          </form>
        </Card>
      )}

      <h3 className="font-display text-sm uppercase tracking-tight mb-3">Individual zones</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {zones?.map((z) => (
          <a
            key={z.id}
            href={link("zone", `&zone=${z.id}`)}
            className="flex items-center justify-between border border-border rounded px-3 py-2 text-sm hover:bg-surface-2"
          >
            <span>{z.zone_name}</span>
            <span className="font-mono text-[11px] text-ink-3 uppercase">xlsx &darr;</span>
          </a>
        ))}
      </div>
    </>
  );
}
