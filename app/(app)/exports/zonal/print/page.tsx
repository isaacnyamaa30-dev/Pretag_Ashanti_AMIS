import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getImportedPeriods } from "@/lib/analytics";
import {
  resolveZonalScope,
  zoneInScope,
  districtInScope,
  getZoneRegister,
  getDistrictRegister,
  getUnitRegister,
  type RegisterMember,
} from "@/lib/r20/zonal-export";
import { PrintToolbar, PrintPageStyle } from "@/components/PrintToolbar";

export const metadata = { title: "Print Membership Register - PRETAG AMIS" };
export const dynamic = "force-dynamic";

/**
 * Printer-friendly membership register for one zone, one district, or one
 * management unit (school). Scope is enforced here on the server, exactly as
 * for the Excel / Word downloads.
 */
export default async function PrintRegisterPage({
  searchParams,
}: {
  searchParams: { period?: string; zone?: string; district?: string; unit?: string; autoprint?: string };
}) {
  const session = await requireUser();
  if (!session.profile) redirect("/dashboard?denied=1");
  const scope = resolveZonalScope(session.profile);
  if (!scope) redirect("/dashboard?denied=1");

  const periods = await getImportedPeriods();
  const period = periods.find((p) => p.id === Number(searchParams.period));
  if (!period) redirect("/exports/zonal");

  const zoneId = Number(searchParams.zone);
  const districtId = Number(searchParams.district);
  const isUnit = searchParams.unit !== undefined && !!districtId;

  let title: string;
  let lines: [string, string][];
  let sections: { heading: string | null; members: RegisterMember[] }[];

  if (isUnit) {
    if (!(await districtInScope(districtId, scope))) redirect("/exports/zonal?denied=1");
    const r = await getUnitRegister(period.id, districtId, searchParams.unit ?? "", period.label);
    title = "MANAGEMENT UNIT MEMBERSHIP REGISTER";
    lines = [
      ["MANAGEMENT UNIT", r.unitName || "(not recorded)"],
      ["DISTRICT", r.districtName],
      ["ZONE", r.zoneName],
      ["R20 PERIOD", period.label],
      ["TOTAL MEMBERS", r.members.length.toLocaleString("en-GB")],
    ];
    sections = [{ heading: null, members: r.members }];
  } else if (districtId) {
    if (!(await districtInScope(districtId, scope))) redirect("/exports/zonal?denied=1");
    const r = await getDistrictRegister(period.id, districtId, period.label);
    title = "DISTRICT MEMBERSHIP REGISTER";
    lines = [
      ["ZONE", r.zoneName],
      ["DISTRICT", r.districtName],
      ["R20 PERIOD", period.label],
      ["TOTAL MEMBERS", r.members.length.toLocaleString("en-GB")],
      ["MANAGEMENT UNITS", String(r.units.length)],
    ];
    sections = [{ heading: null, members: r.members }];
  } else if (zoneId) {
    if (!zoneInScope(zoneId, scope)) redirect("/exports/zonal?denied=1");
    const r = await getZoneRegister(period.id, zoneId, period.label);
    title = "ZONAL MEMBERSHIP REGISTER";
    lines = [
      ["ZONE", r.zoneName],
      ["R20 PERIOD", period.label],
      ["TOTAL MEMBERS", r.members.length.toLocaleString("en-GB")],
      ["NUMBER OF DISTRICTS", String(r.districts.length)],
    ];
    sections = r.districts.map((d) => ({
      heading: `DISTRICT: ${d.name.toUpperCase()} (${d.count.toLocaleString("en-GB")} member${d.count === 1 ? "" : "s"})`,
      members: r.members.filter((m) => m.district === d.name),
    }));
  } else {
    redirect("/exports/zonal");
  }

  const subject = lines[0][1];
  return (
    <div className="print-doc">
      <PrintPageStyle landscape footer={`PRETAG Ashanti Region · ${subject} · R20 Period: ${period.label}`} />
      <PrintToolbar autoPrint={searchParams.autoprint === "1"} backHref={`/exports/zonal?period=${period.id}`} />

      <div className="bg-white text-black border border-border rounded p-5 print:border-0 print:p-0">
        <div className="flex items-center gap-4 border-b-2 border-[#c4161c] pb-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/pretag-emblem.jpg" alt="PRETAG" width={56} height={56} className="rounded-full" />
          <div>
            <div className="font-display text-xl font-extrabold uppercase text-[#c4161c] leading-tight">PRETAG Ashanti Region</div>
            <div className="font-display text-base font-extrabold uppercase leading-tight">{title}</div>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm mb-4">
          {lines.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono font-bold">{k}:</dt>
              <dd className="font-mono">{v}</dd>
            </div>
          ))}
        </dl>

        {sections.map((s, si) => (
          <section key={si} className="mb-5">
            {s.heading && <h2 className="font-mono font-bold text-sm text-[#c4161c] mb-1.5 mt-3">{s.heading}</h2>}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono border border-[#999] min-w-[560px]">
                <thead>
                  <tr className="bg-[#c4161c] text-white text-left">
                    <th className="px-2 py-1.5 w-10">NO.</th>
                    <th className="px-2 py-1.5">EMPLOYEE NO</th>
                    <th className="px-2 py-1.5">NAME OF EMPLOYEE</th>
                    <th className="px-2 py-1.5">MANAGEMENT UNIT</th>
                    <th className="px-2 py-1.5">DISTRICT</th>
                  </tr>
                </thead>
                <tbody>
                  {s.members.map((m, i) => (
                    <tr key={`${m.employeeNo}-${i}`} className="border-t border-[#ccc] even:bg-[#f7efd5]">
                      <td className="px-2 py-1 tabular-nums">{i + 1}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{m.employeeNo}</td>
                      <td className="px-2 py-1">{m.name}</td>
                      <td className="px-2 py-1">{m.managementUnit || "—"}</td>
                      <td className="px-2 py-1">{m.district}</td>
                    </tr>
                  ))}
                  {s.members.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-2 italic">No members in this R20 period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        <p className="text-[11px] font-mono mt-4">
          Sorted by district, management unit and employee name (A&ndash;Z). Generated by PRETAG AMIS from the approved{" "}
          {period.label} R20. Confidential: for authorised PRETAG officers only.
        </p>
      </div>
    </div>
  );
}
