import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  getZoneRegister,
  buildZoneRegisterExcel,
  buildZoneRegisterWord,
  getDistrictRegister,
  buildDistrictRegisterExcel,
  buildDistrictRegisterWord,
  getUnitRegister,
  buildUnitRegisterExcel,
  buildUnitRegisterWord,
  buildAllZonesRegisterZip,
  resolveZonalScope,
  BULK_EXPORT_ROLES,
  type AllZonesFormat,
  type ZonalScope,
} from "@/lib/r20/zonal-export";
import { getRegionalSummary, buildRegionalSummaryExcel, buildRegionalSummaryWord } from "@/lib/r20/regional-summary";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const forbidden = (message: string) => NextResponse.json({ error: message }, { status: 403 });

function zoneAllowed(zoneId: number, scope: ZonalScope) {
  if (scope.level === "region") return true;
  if (scope.level === "zone") return scope.zoneId === zoneId;
  return false; // a district-scoped user has no whole-zone access
}

async function districtAllowed(districtId: number, scope: ZonalScope) {
  if (scope.level === "region") return true;
  if (scope.level === "district") return scope.districtId === districtId;
  // scope.level === "zone": the district must belong to that zone
  const { data } = await createClient().from("districts").select("zone_id").eq("id", districtId).single();
  return data?.zone_id === scope.zoneId;
}

export async function GET(req: NextRequest) {
  const session = await requireUser();
  if (!session.profile) return forbidden("No profile linked to this account");

  const scope = resolveZonalScope(session.profile);
  if (!scope) return forbidden("Not authorised for the Zonal Membership Export");

  const params = req.nextUrl.searchParams;
  const periodId = Number(params.get("period"));
  const type = params.get("type");
  if (!periodId) return NextResponse.json({ error: "period required" }, { status: 400 });

  const supabase = createClient();
  const { data: period } = await supabase
    .from("reporting_periods")
    .select("label")
    .eq("id", periodId)
    .maybeSingle();
  if (!period) return NextResponse.json({ error: "period not found" }, { status: 404 });

  if (type === "regional-summary" || type === "regional-summary-docx") {
    if (scope.level !== "region") return forbidden("Not authorised for the regional summary");
    const summary = await getRegionalSummary(periodId, period.label);
    const docx = type === "regional-summary-docx";
    const out = docx ? await buildRegionalSummaryWord(summary) : await buildRegionalSummaryExcel(summary);
    await logAudit({
      action: "export.zonal.regional_summary",
      resourceType: "reporting_period",
      resourceId: periodId,
      details: { format: docx ? "docx" : "xlsx" },
    });
    return new NextResponse(out.buffer as BodyInit, {
      headers: {
        "Content-Type": docx ? DOCX_TYPE : XLSX_TYPE,
        "Content-Disposition": `attachment; filename="${out.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (type === "all") {
    if (!BULK_EXPORT_ROLES.includes(session.profile.role)) {
      return forbidden("Not authorised for the bulk zone export");
    }
    const format = (params.get("format") as AllZonesFormat) ?? "both";
    if (!["xlsx", "docx", "both"].includes(format)) {
      return NextResponse.json({ error: "invalid format" }, { status: 400 });
    }
    const out = await buildAllZonesRegisterZip(periodId, period.label, format);
    await logAudit({
      action: "export.zonal.all",
      resourceType: "reporting_period",
      resourceId: periodId,
      details: { format },
    });
    return new NextResponse(out.buffer as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${out.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (type === "district" || type === "district-docx") {
    const districtId = Number(params.get("district"));
    if (!districtId) return NextResponse.json({ error: "district required" }, { status: 400 });
    if (!(await districtAllowed(districtId, scope))) return forbidden("Not authorised for that district");

    const register = await getDistrictRegister(periodId, districtId, period.label);
    const out = type === "district-docx" ? await buildDistrictRegisterWord(register) : await buildDistrictRegisterExcel(register);
    await logAudit({
      action: "export.zonal.district",
      resourceType: "reporting_period",
      resourceId: periodId,
      details: { districtId, format: type === "district-docx" ? "docx" : "xlsx" },
    });
    return new NextResponse(out.buffer as BodyInit, {
      headers: {
        "Content-Type": type === "district-docx" ? DOCX_TYPE : XLSX_TYPE,
        "Content-Disposition": `attachment; filename="${out.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (type === "unit" || type === "unit-docx") {
    const districtId = Number(params.get("district"));
    const unitName = params.get("unit") ?? "";
    if (!districtId) return NextResponse.json({ error: "district required" }, { status: 400 });
    if (!(await districtAllowed(districtId, scope))) return forbidden("Not authorised for that district");

    const register = await getUnitRegister(periodId, districtId, unitName, period.label);
    const out = type === "unit-docx" ? await buildUnitRegisterWord(register) : await buildUnitRegisterExcel(register);
    await logAudit({
      action: "export.zonal.unit",
      resourceType: "reporting_period",
      resourceId: periodId,
      details: { districtId, unitName, format: type === "unit-docx" ? "docx" : "xlsx" },
    });
    return new NextResponse(out.buffer as BodyInit, {
      headers: {
        "Content-Type": type === "unit-docx" ? DOCX_TYPE : XLSX_TYPE,
        "Content-Disposition": `attachment; filename="${out.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const zoneId = Number(params.get("zone"));
  if (!zoneId) return NextResponse.json({ error: "zone required" }, { status: 400 });
  if (!zoneAllowed(zoneId, scope)) return forbidden("Not authorised for that zone");

  const register = await getZoneRegister(periodId, zoneId, period.label);
  const out =
    type === "docx" ? await buildZoneRegisterWord(register) : await buildZoneRegisterExcel(register);

  await logAudit({
    action: "export.zonal",
    resourceType: "reporting_period",
    resourceId: periodId,
    details: { zoneId, type: type === "docx" ? "docx" : "xlsx" },
  });

  return new NextResponse(out.buffer as BodyInit, {
    headers: {
      "Content-Type": type === "docx" ? DOCX_TYPE : XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${out.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
