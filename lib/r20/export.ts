/**
 * R20 export (build-plan Phase 6). Regenerates the Regional workbook, each of
 * the 18 zone workbooks (one sheet per district, matching the supplied format),
 * and a ZIP of all zones - for any imported period, straight from
 * membership_snapshots.
 */
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { REQUIRED_HEADERS } from "./parser";

type SnapshotRow = {
  employee_no: string;
  employee_name: string | null;
  management_unit: string | null;
  raw_district: string | null;
  zone_id: number | null;
  district_id: number | null;
};

async function fetchSnapshots(periodId: number, zoneId?: number) {
  const supabase = createClient();
  const rows: SnapshotRow[] = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase
      .from("membership_snapshots")
      .select("employee_no, employee_name, management_unit, raw_district, zone_id, district_id")
      .eq("period_id", periodId)
      .order("employee_no")
      .range(from, from + 999);
    if (zoneId) q = q.eq("zone_id", zoneId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows.push(...(data as SnapshotRow[]));
    if (data.length < 1000) break;
  }
  return rows;
}

function styleHeader(ws: ExcelJS.Worksheet) {
  const h = ws.getRow(1);
  h.font = { bold: true };
  h.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7EFD5" } };
  });
  ws.columns = [
    { width: 14 },
    { width: 34 },
    { width: 40 },
    { width: 26 },
    { width: 12 },
  ];
}

function addSheet(wb: ExcelJS.Workbook, name: string, rows: SnapshotRow[]) {
  // Excel sheet names: <=31 chars, no []:*?/\
  const safe = name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31).trim() || "Sheet";
  const ws = wb.addWorksheet(safe);
  ws.addRow(REQUIRED_HEADERS);
  for (const r of rows) {
    ws.addRow([
      r.employee_no,
      r.employee_name ?? "",
      r.management_unit ?? "",
      r.raw_district ?? "",
      "Ashanti",
    ]);
  }
  styleHeader(ws);
  return ws;
}

export async function buildRegionalWorkbook(periodId: number, label: string) {
  const rows = await fetchSnapshots(periodId);
  const wb = new ExcelJS.Workbook();
  wb.creator = "PRETAG AMIS";
  addSheet(wb, "Ashanti Region", rows);
  return {
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    filename: `PRETAG_ASHANTI_R20_${label.replace(/\s+/g, "_").toUpperCase()}.xlsx`,
  };
}

export async function buildZoneWorkbook(periodId: number, zoneId: number, label: string) {
  const supabase = createClient();
  const [{ data: zone }, { data: districts }] = await Promise.all([
    supabase.from("zones").select("zone_name").eq("id", zoneId).single(),
    supabase.from("districts").select("id, district_name").eq("zone_id", zoneId).order("district_name"),
  ]);
  const rows = await fetchSnapshots(periodId, zoneId);
  const byDistrict = new Map<number, SnapshotRow[]>();
  for (const r of rows) {
    if (r.district_id == null) continue;
    let list = byDistrict.get(r.district_id);
    if (!list) byDistrict.set(r.district_id, (list = []));
    list.push(r);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "PRETAG AMIS";
  for (const d of districts ?? []) {
    addSheet(wb, d.district_name, byDistrict.get(d.id) ?? []);
  }
  const zn = (zone?.zone_name ?? `zone-${zoneId}`).replace(/\s*&\s*/g, "_AND_").replace(/\s+/g, "_");
  return {
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    filename: `${zn.toUpperCase()}_R20_${label.replace(/\s+/g, "_").toUpperCase()}.xlsx`,
  };
}

export async function buildAllZonesZip(periodId: number, label: string) {
  const supabase = createClient();
  const { data: zones } = await supabase.from("zones").select("id").order("zone_name");
  const zip = new JSZip();
  for (const z of zones ?? []) {
    const { buffer, filename } = await buildZoneWorkbook(periodId, z.id, label);
    zip.file(filename, buffer);
  }
  const regional = await buildRegionalWorkbook(periodId, label);
  zip.file(regional.filename, regional.buffer);
  return {
    buffer: await zip.generateAsync({ type: "nodebuffer" }),
    filename: `PRETAG_ASHANTI_${label.replace(/\s+/g, "_").toUpperCase()}.zip`,
  };
}
