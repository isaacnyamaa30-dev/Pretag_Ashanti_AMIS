import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  buildRegionalWorkbook,
  buildZoneWorkbook,
  buildAllZonesZip,
  buildComparisonWorkbook,
} from "@/lib/r20/export";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  await requireStaff();

  const params = req.nextUrl.searchParams;
  const periodId = Number(params.get("period"));
  const type = params.get("type") ?? "regional";
  const zoneId = Number(params.get("zone"));

  const supabase = createClient();

  if (type === "comparison") {
    const fromId = Number(params.get("from"));
    const toId = Number(params.get("to"));
    if (!fromId || !toId) return NextResponse.json({ error: "from and to required" }, { status: 400 });
    const { data: ps } = await supabase
      .from("reporting_periods")
      .select("id, label")
      .in("id", [fromId, toId]);
    const fromLabel = ps?.find((p) => p.id === fromId)?.label ?? "prev";
    const toLabel = ps?.find((p) => p.id === toId)?.label ?? "cur";
    const cmp = await buildComparisonWorkbook(fromId, toId, fromLabel, toLabel);
    await logAudit({ action: "export.comparison", resourceType: "reporting_period", details: { fromId, toId } });
    return new NextResponse(cmp.buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${cmp.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (!periodId) return NextResponse.json({ error: "period required" }, { status: 400 });

  const { data: period } = await supabase
    .from("reporting_periods")
    .select("label")
    .eq("id", periodId)
    .maybeSingle();
  if (!period) return NextResponse.json({ error: "period not found" }, { status: 404 });

  let out: { buffer: Buffer | ArrayBuffer; filename: string };
  let contentType: string;

  if (type === "zip") {
    out = await buildAllZonesZip(periodId, period.label);
    contentType = "application/zip";
  } else if (type === "zone" && zoneId) {
    out = await buildZoneWorkbook(periodId, zoneId, period.label);
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    out = await buildRegionalWorkbook(periodId, period.label);
    contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  await logAudit({
    action: "export.download",
    resourceType: "reporting_period",
    resourceId: periodId,
    details: { type, zoneId: zoneId || null, filename: out.filename },
  });

  return new NextResponse(out.buffer as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${out.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
