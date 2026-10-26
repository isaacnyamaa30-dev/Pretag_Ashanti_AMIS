import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  getZoneRegister,
  buildZoneRegisterExcel,
  buildZoneRegisterWord,
  buildAllZonesRegisterZip,
  BULK_EXPORT_ROLES,
  type AllZonesFormat,
} from "@/lib/r20/zonal-export";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const session = await requireStaff();

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

  if (type === "all") {
    if (!BULK_EXPORT_ROLES.includes(session.profile.role)) {
      return NextResponse.json({ error: "Not authorised for the bulk zone export" }, { status: 403 });
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

  const zoneId = Number(params.get("zone"));
  if (!zoneId) return NextResponse.json({ error: "zone required" }, { status: 400 });

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
