import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";

export const metadata = { title: "Member Profile - PRETAG AMIS" };

export default async function MemberProfilePage({ params }: { params: { employeeNo: string } }) {
  const supabase = createClient();
  const empNo = decodeURIComponent(params.employeeNo);

  const { data: member } = await supabase
    .from("members")
    .select("id, employee_no, current_name, current_management_unit, zones:current_zone_id(zone_name), districts:current_district_id(district_name), regions:current_region_id(region_name)")
    .eq("employee_no", empNo)
    .maybeSingle();
  if (!member) notFound();

  const { data: snaps } = await supabase
    .from("membership_snapshots")
    .select("period_id, employee_name, management_unit, raw_district, zones(zone_name), districts(district_name), reporting_periods(label, year, month)")
    .eq("employee_no", empNo);

  const { data: allPeriods } = await supabase
    .from("reporting_periods")
    .select("id, label, year, month, r20_uploads!inner(status)")
    .eq("r20_uploads.status", "imported")
    .order("year")
    .order("month");

  const seen = new Map((snaps ?? []).map((s) => [s.period_id, s]));
  const timeline = (allPeriods ?? []).map((p) => {
    const s = seen.get(p.id);
    return {
      label: p.label,
      present: !!s,
      zone: s ? (s.zones as { zone_name?: string } | null)?.zone_name : null,
      district: s ? (s.districts as { district_name?: string } | null)?.district_name : null,
      mu: s?.management_unit ?? null,
    };
  });

  return (
    <>
      <PageHeader title={member.current_name ?? empNo} sub={`Employee no ${member.employee_no}`} />
      <Link href="/members" className="text-xs font-mono underline text-ink-3 hover:text-primary">
        &larr; back to search
      </Link>

      <div className="grid md:grid-cols-2 gap-4 mt-4 mb-8">
        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-3">Current placement</h3>
          <dl className="text-sm font-mono grid grid-cols-[8rem_1fr] gap-y-1.5">
            <dt className="text-ink-3">Management unit</dt>
            <dd>{member.current_management_unit ?? "-"}</dd>
            <dt className="text-ink-3">District</dt>
            <dd>{(member.districts as { district_name?: string } | null)?.district_name ?? "-"}</dd>
            <dt className="text-ink-3">Zone</dt>
            <dd>{(member.zones as { zone_name?: string } | null)?.zone_name ?? "-"}</dd>
            <dt className="text-ink-3">Region</dt>
            <dd>{(member.regions as { region_name?: string } | null)?.region_name ?? "Ashanti"}</dd>
          </dl>
        </Card>
        <Card>
          <h3 className="font-display text-sm uppercase tracking-tight mb-3">R20 history</h3>
          <div className="flex flex-col gap-1">
            {timeline.map((t) => (
              <div key={t.label} className="flex items-center gap-3 text-sm font-mono">
                <span
                  className={`w-2 h-2 rounded-full ${t.present ? "bg-grow" : "bg-decline"}`}
                  aria-hidden
                />
                <span className="w-32">{t.label}</span>
                <span className={t.present ? "text-ink-2" : "text-decline"}>
                  {t.present ? `Present - ${t.zone} / ${t.district}` : "Not in R20"}
                </span>
              </div>
            ))}
            {timeline.length === 0 && <p className="text-sm text-ink-3">No imported periods yet.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}
