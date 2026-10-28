/**
 * Zonal Membership Export - a standalone module, separate from the existing
 * Export Centre (`lib/r20/export.ts`), producing a stripped-down four-column
 * membership register (Employee No / Name / Management Unit / District) per
 * zone, for sharing with Zonal Officers. Does not touch or depend on the
 * existing export code.
 */
import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  PageOrientation,
  Header,
  Footer,
  PageNumber,
  ShadingType,
} from "docx";
import { createClient } from "@/lib/supabase/server";

export const BRAND_RED = "C4161C";
const GOLD_WASH = "F7EFD5";

export type RegisterMember = {
  employeeNo: string;
  name: string;
  managementUnit: string;
  district: string;
};

export type ZoneRegister = {
  zoneId: number;
  zoneName: string;
  periodLabel: string;
  members: RegisterMember[];
  districts: { name: string; count: number }[];
};

/** Case/whitespace-insensitive key for sorting only - the stored value (and
 *  which members share a school) is never altered, so two genuinely different
 *  management units are never folded into one group just because they compare
 *  similarly once trimmed and upper-cased. */
export const sortKey = (s: string) => s.trim().toLocaleUpperCase();

/** District (A-Z) -> Management Unit / school (A-Z, blank last) -> Name (A-Z). */
function compareMembers(a: RegisterMember, b: RegisterMember) {
  const district = sortKey(a.district).localeCompare(sortKey(b.district));
  if (district !== 0) return district;

  const aBlank = sortKey(a.managementUnit) === "";
  const bBlank = sortKey(b.managementUnit) === "";
  if (aBlank !== bBlank) return aBlank ? 1 : -1;

  const unit = sortKey(a.managementUnit).localeCompare(sortKey(b.managementUnit));
  if (unit !== 0) return unit;

  return sortKey(a.name).localeCompare(sortKey(b.name));
}

/** A clean .xlsx-safe sheet name, never empty, never a duplicate within one workbook. */
export function sheetName(name: string, used: Set<string>) {
  let base = name.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export async function getZoneRegister(periodId: number, zoneId: number, periodLabel: string): Promise<ZoneRegister> {
  const supabase = createClient();

  const [{ data: zone }, { data: zoneDistricts }] = await Promise.all([
    supabase.from("zones").select("zone_name").eq("id", zoneId).single(),
    supabase.from("districts").select("district_name").eq("zone_id", zoneId).order("district_name"),
  ]);

  type Row = {
    employee_no: string;
    employee_name: string | null;
    management_unit: string | null;
    raw_district: string | null;
    districts: { district_name?: string } | null;
  };

  const rows: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("membership_snapshots")
      .select("employee_no, employee_name, management_unit, raw_district, districts:district_id(district_name)")
      .eq("period_id", periodId)
      .eq("zone_id", zoneId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < PAGE) break;
  }

  const members: RegisterMember[] = rows.map((r) => ({
    employeeNo: r.employee_no,
    name: r.employee_name ?? "",
    managementUnit: r.management_unit ?? "",
    district: r.districts?.district_name ?? r.raw_district ?? "Unassigned",
  }));

  members.sort(compareMembers);

  // Every official district of this zone gets a row/sheet, even one with zero
  // members this period - not just districts that happen to appear in the data.
  const districtCounts = new Map<string, number>();
  for (const d of zoneDistricts ?? []) districtCounts.set(d.district_name, 0);
  for (const m of members) districtCounts.set(m.district, (districtCounts.get(m.district) ?? 0) + 1);
  const districts = [...districtCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    zoneId,
    zoneName: zone?.zone_name ?? `Zone ${zoneId}`,
    periodLabel,
    members,
    districts,
  };
}

export function autoWidth(values: string[], min = 10, max = 48) {
  const longest = values.reduce((m, v) => Math.max(m, v.length), 0);
  return Math.min(max, Math.max(min, longest + 2));
}

export function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND_RED}` } };
    cell.alignment = { vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF999999" } },
      bottom: { style: "thin", color: { argb: "FF999999" } },
      left: { style: "thin", color: { argb: "FF999999" } },
      right: { style: "thin", color: { argb: "FF999999" } },
    };
  });
}

function writeMemberSheet(wb: ExcelJS.Workbook, name: string, title: string[], members: RegisterMember[], used: Set<string>) {
  const ws = wb.addWorksheet(sheetName(name, used));
  title.forEach((line, i) => {
    const row = ws.addRow([line]);
    row.font = i === 0 ? { bold: true, size: 14 } : { italic: i > 1, size: 11 };
  });
  ws.addRow([]);

  const headerRowNo = ws.lastRow!.number + 1;
  const header = ws.addRow(["EMPLOYEE NO", "NAME OF EMPLOYEE", "MANAGEMENT UNIT", "DISTRICT"]);
  styleHeaderRow(header);

  members.forEach((m, i) => {
    const row = ws.addRow([m.employeeNo, m.name, m.managementUnit, m.district]);
    const stripe = i % 2 === 1;
    row.eachCell((cell, col) => {
      if (col === 1) cell.numFmt = "@"; // employee no stays text - no lost leading zeros
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDD5C0" } },
        bottom: { style: "thin", color: { argb: "FFDDD5C0" } },
        left: { style: "thin", color: { argb: "FFDDD5C0" } },
        right: { style: "thin", color: { argb: "FFDDD5C0" } },
      };
      if (stripe) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${GOLD_WASH}` } };
    });
  });

  ws.getColumn(1).width = autoWidth(["EMPLOYEE NO", ...members.map((m) => m.employeeNo)]);
  ws.getColumn(2).width = autoWidth(["NAME OF EMPLOYEE", ...members.map((m) => m.name)]);
  ws.getColumn(3).width = autoWidth(["MANAGEMENT UNIT", ...members.map((m) => m.managementUnit)]);
  ws.getColumn(4).width = autoWidth(["DISTRICT", ...members.map((m) => m.district)]);
  ws.views = [{ state: "frozen", ySplit: headerRowNo }];
  ws.autoFilter = { from: { row: headerRowNo, column: 1 }, to: { row: headerRowNo, column: 4 } };
  return ws;
}

export async function buildZoneRegisterExcel(register: ZoneRegister) {
  const { zoneName, periodLabel, members, districts } = register;
  const wb = new ExcelJS.Workbook();
  wb.creator = "PRETAG AMIS";
  const used = new Set<string>();

  const summary = wb.addWorksheet(sheetName("Summary", used));
  summary.addRow(["PRETAG ASHANTI REGION"]).font = { bold: true, size: 14 };
  summary.addRow([`${zoneName.toUpperCase()} - MEMBERSHIP REGISTER`]).font = { bold: true, size: 12 };
  summary.addRow([`R20 Period: ${periodLabel}`]).font = { italic: true };
  summary.addRow([]);
  summary.addRow(["Total members", members.length]).font = { bold: true };
  summary.addRow(["Number of districts", districts.length]).font = { bold: true };
  summary.addRow([]);
  const sumHeader = summary.addRow(["DISTRICT", "MEMBERS"]);
  styleHeaderRow(sumHeader);
  for (const d of districts) summary.addRow([d.name, d.count]);
  summary.getColumn(1).width = autoWidth(["DISTRICT", ...districts.map((d) => d.name)]);
  summary.getColumn(2).width = 14;

  writeMemberSheet(
    wb,
    "All Members",
    ["PRETAG ASHANTI REGION", `${zoneName.toUpperCase()} - MEMBERSHIP REGISTER`, `R20 Period: ${periodLabel}`],
    members,
    used,
  );

  for (const d of districts) {
    writeMemberSheet(
      wb,
      d.name,
      [
        "PRETAG ASHANTI REGION",
        `${zoneName.toUpperCase()} - MEMBERSHIP REGISTER`,
        `District: ${d.name}  ·  R20 Period: ${periodLabel}`,
      ],
      members.filter((m) => m.district === d.name),
      used,
    );
  }

  const fname = `PRETAG_${zoneName.replace(/\s+/g, "_")}_MEMBERSHIP_REGISTER_${periodLabel.replace(/\s+/g, "_")}.xlsx`.toUpperCase();
  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), filename: fname };
}

const WIDTHS = [14, 28, 34, 24]; // percent

function wcell(text: string, opts: { bold?: boolean; header?: boolean; pct: number }) {
  return new TableCell({
    width: { size: opts.pct, type: WidthType.PERCENTAGE },
    shading: opts.header ? { type: ShadingType.SOLID, color: BRAND_RED, fill: BRAND_RED } : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts.bold,
            size: 18,
            color: opts.header ? "FFFFFF" : undefined,
          }),
        ],
      }),
    ],
  });
}

function memberTable(members: RegisterMember[]) {
  const header = new TableRow({
    tableHeader: true,
    children: [
      wcell("EMPLOYEE NO", { bold: true, header: true, pct: WIDTHS[0] }),
      wcell("NAME OF EMPLOYEE", { bold: true, header: true, pct: WIDTHS[1] }),
      wcell("MANAGEMENT UNIT", { bold: true, header: true, pct: WIDTHS[2] }),
      wcell("DISTRICT", { bold: true, header: true, pct: WIDTHS[3] }),
    ],
  });
  const body = members.map(
    (m) =>
      new TableRow({
        children: [
          wcell(m.employeeNo, { pct: WIDTHS[0] }),
          wcell(m.name, { pct: WIDTHS[1] }),
          wcell(m.managementUnit, { pct: WIDTHS[2] }),
          wcell(m.district, { pct: WIDTHS[3] }),
        ],
      }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] });
}

const A4_LANDSCAPE = { width: 16838, height: 11906, orientation: PageOrientation.LANDSCAPE };

export async function buildZoneRegisterWord(register: ZoneRegister) {
  const { zoneName, periodLabel, members, districts } = register;

  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "PRETAG ASHANTI REGION  ·  ", bold: true, size: 16, color: BRAND_RED }),
          new TextRun({ text: `${zoneName.toUpperCase()} MEMBERSHIP REGISTER  ·  R20 PERIOD: ${periodLabel.toUpperCase()}`, size: 16 }),
        ],
      }),
    ],
  });
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Pre-Tertiary Teachers Association of Ghana - Ashanti Region  ·  Page ", size: 14, color: "666666" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "666666" }),
          new TextRun({ text: " of ", size: 14, color: "666666" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "666666" }),
        ],
      }),
    ],
  });

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "PRETAG ASHANTI REGION", bold: true, size: 32, color: BRAND_RED })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(zoneName.toUpperCase())],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "MEMBERSHIP REGISTER", bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `R20 PERIOD: ${periodLabel.toUpperCase()}`, italics: true, size: 20 })],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Zone total: ${members.length} member${members.length === 1 ? "" : "s"} across ${districts.length} district${districts.length === 1 ? "" : "s"}.`, bold: true, size: 20 }),
      ],
    }),
    new Paragraph({ text: "" }),
  ];

  for (const d of districts) {
    const dMembers = members.filter((m) => m.district === d.name);
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 260, after: 100 },
        children: [new TextRun({ text: `DISTRICT: ${d.name.toUpperCase()}`, bold: true, color: BRAND_RED })],
      }),
      memberTable(dMembers),
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: `Total: ${dMembers.length} member${dMembers.length === 1 ? "" : "s"}`, italics: true, size: 18 })],
      }),
    );
  }

  const doc = new Document({
    creator: "PRETAG AMIS",
    title: `${zoneName} Membership Register - ${periodLabel}`,
    sections: [
      {
        properties: { page: { size: A4_LANDSCAPE } },
        headers: { default: header },
        footers: { default: footer },
        children,
      },
    ],
  });

  const fname = `PRETAG_${zoneName.replace(/\s+/g, "_")}_MEMBERSHIP_REGISTER_${periodLabel.replace(/\s+/g, "_")}.docx`.toUpperCase();
  return { buffer: await Packer.toBuffer(doc), filename: fname };
}

export type AllZonesFormat = "xlsx" | "docx" | "both";

/** One ZIP with a folder per zone (all 18, even an empty one), each holding the
 *  requested format(s) of that zone's membership register. */
export async function buildAllZonesRegisterZip(periodId: number, periodLabel: string, format: AllZonesFormat) {
  const supabase = createClient();
  const { data: zones } = await supabase.from("zones").select("id, zone_name").order("zone_name");

  const zip = new JSZip();
  for (const z of zones ?? []) {
    const register = await getZoneRegister(periodId, z.id, periodLabel);
    const folder = z.zone_name.replace(/[\\/:*?"<>|]/g, " ").trim();
    if (format === "xlsx" || format === "both") {
      const { buffer, filename } = await buildZoneRegisterExcel(register);
      zip.file(`${folder}/${filename}`, buffer);
    }
    if (format === "docx" || format === "both") {
      const { buffer, filename } = await buildZoneRegisterWord(register);
      zip.file(`${folder}/${filename}`, buffer);
    }
  }

  return {
    buffer: await zip.generateAsync({ type: "nodebuffer" }),
    filename: `PRETAG_ASHANTI_ALL_ZONES_MEMBERSHIP_REGISTER_${periodLabel.replace(/\s+/g, "_")}.zip`.toUpperCase(),
  };
}

export const BULK_EXPORT_ROLES = ["Super Administrator", "Regional Administrator", "Regional Data Officer"];

/* ------------------------------------------------------------------------ *
 * Expandable Zone -> District -> Management Unit directory, plus district-
 * and unit-level downloads. Builds on the types/helpers above; does not
 * change any existing zone-level behaviour.
 * ------------------------------------------------------------------------ */

export type DirectoryUnit = { name: string; count: number; members: RegisterMember[] };
export type DirectoryDistrict = { id: number; name: string; count: number; units: DirectoryUnit[] };
export type DirectoryZone = { id: number; name: string; count: number; districts: DirectoryDistrict[] };
export type DirectoryTree = {
  periodLabel: string;
  totalMembers: number;
  zones: DirectoryZone[];
};

export type ZonalScope =
  | { level: "region" }
  | { level: "zone"; zoneId: number }
  | { level: "district"; districtId: number };

export const ZONE_EXECUTIVE_ROLE = "Zone Executive";
export const DISTRICT_EXECUTIVE_ROLE = "District Executive";

/** Who may open the directory at all, and how far their own view/export reach
 *  extends. Region-wide roles (existing STAFF_ROLES) see everything; a Zone
 *  Executive is confined to their own zone; a District Executive to their own
 *  district. Anyone else (including Viewer, or a scoped role missing its
 *  zone/district assignment) gets no access. */
export function resolveZonalScope(profile: {
  role: string;
  zone_id: number | null;
  district_id: number | null;
}): ZonalScope | null {
  if (["Super Administrator", "Regional Administrator", "Regional Executive", "Regional Data Officer"].includes(profile.role)) {
    return { level: "region" };
  }
  if (profile.role === ZONE_EXECUTIVE_ROLE && profile.zone_id != null) {
    return { level: "zone", zoneId: profile.zone_id };
  }
  if (profile.role === DISTRICT_EXECUTIVE_ROLE && profile.district_id != null) {
    return { level: "district", districtId: profile.district_id };
  }
  return null;
}

type SnapshotRow = {
  employee_no: string;
  employee_name: string | null;
  management_unit: string | null;
  raw_district: string | null;
  zone_id: number | null;
  district_id: number | null;
  districts: { district_name?: string } | null;
};

async function fetchScopedSnapshots(
  periodId: number,
  filter: { zoneId?: number; districtId?: number },
): Promise<SnapshotRow[]> {
  const supabase = createClient();
  const rows: SnapshotRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("membership_snapshots")
      .select("employee_no, employee_name, management_unit, raw_district, zone_id, district_id, districts:district_id(district_name)")
      .eq("period_id", periodId)
      .range(from, from + PAGE - 1);
    if (filter.zoneId) q = q.eq("zone_id", filter.zoneId);
    if (filter.districtId) q = q.eq("district_id", filter.districtId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as unknown as SnapshotRow[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** The full expandable directory for a period, optionally narrowed to one
 *  zone or one district (for a Zone/District Executive's restricted view).
 *  Management units are grouped by their exact stored text - never folded
 *  together just because two entries differ only in case or spacing. */
export async function getDirectoryTree(
  periodId: number,
  periodLabel: string,
  scope: ZonalScope = { level: "region" },
): Promise<DirectoryTree> {
  const supabase = createClient();

  const zoneFilter = scope.level === "zone" ? scope.zoneId : undefined;
  const districtFilter = scope.level === "district" ? scope.districtId : undefined;

  let zonesQuery = supabase.from("zones").select("id, zone_name").order("zone_name");
  if (zoneFilter) zonesQuery = zonesQuery.eq("id", zoneFilter);
  if (districtFilter) {
    const { data: d } = await supabase.from("districts").select("zone_id").eq("id", districtFilter).single();
    if (d?.zone_id) zonesQuery = zonesQuery.eq("id", d.zone_id);
  }

  let districtsQuery = supabase.from("districts").select("id, district_name, zone_id").order("district_name");
  if (zoneFilter) districtsQuery = districtsQuery.eq("zone_id", zoneFilter);
  if (districtFilter) districtsQuery = districtsQuery.eq("id", districtFilter);

  const [{ data: zoneRows }, { data: districtRows }, rows] = await Promise.all([
    zonesQuery,
    districtsQuery,
    fetchScopedSnapshots(periodId, { zoneId: zoneFilter, districtId: districtFilter }),
  ]);

  const districtsByZone = new Map<number, { id: number; name: string }[]>();
  for (const d of districtRows ?? []) {
    const list = districtsByZone.get(d.zone_id) ?? [];
    list.push({ id: d.id, name: d.district_name });
    districtsByZone.set(d.zone_id, list);
  }

  // zoneId -> districtId -> unit name (exact) -> members
  const byZone = new Map<number, Map<number, Map<string, RegisterMember[]>>>();
  for (const r of rows) {
    if (r.zone_id == null || r.district_id == null) continue;
    const member: RegisterMember = {
      employeeNo: r.employee_no,
      name: r.employee_name ?? "",
      managementUnit: r.management_unit ?? "",
      district: r.districts?.district_name ?? r.raw_district ?? "Unassigned",
    };
    let zoneMap = byZone.get(r.zone_id);
    if (!zoneMap) byZone.set(r.zone_id, (zoneMap = new Map()));
    let distMap = zoneMap.get(r.district_id);
    if (!distMap) zoneMap.set(r.district_id, (distMap = new Map()));
    const unitKey = member.managementUnit; // exact text - never normalised for grouping
    const list = distMap.get(unitKey) ?? [];
    list.push(member);
    distMap.set(unitKey, list);
  }

  let totalMembers = 0;
  const zones: DirectoryZone[] = (zoneRows ?? []).map((z) => {
    const zoneMap = byZone.get(z.id);
    const districts: DirectoryDistrict[] = (districtsByZone.get(z.id) ?? []).map((d) => {
      const distMap = zoneMap?.get(d.id);
      const units: DirectoryUnit[] = [...(distMap?.entries() ?? [])]
        .map(([name, members]) => {
          members.sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)));
          return { name, count: members.length, members };
        })
        .sort((a, b) => {
          const aBlank = sortKey(a.name) === "";
          const bBlank = sortKey(b.name) === "";
          if (aBlank !== bBlank) return aBlank ? 1 : -1;
          return sortKey(a.name).localeCompare(sortKey(b.name));
        });
      const count = units.reduce((n, u) => n + u.count, 0);
      return { id: d.id, name: d.name, count, units };
    });
    const count = districts.reduce((n, d) => n + d.count, 0);
    totalMembers += count;
    return { id: z.id, name: z.zone_name, count, districts };
  });

  return { periodLabel, totalMembers, zones };
}

type GroupBreakdown = { name: string; count: number };

/** Shared Excel builder behind the zone/district/unit registers: a Summary
 *  sheet (skipped when there is nothing to break down further), an "All
 *  Members" sheet, and one sheet per sub-group when `groupOf` is given. */
async function buildRegisterWorkbook(opts: {
  titleLines: string[];
  members: RegisterMember[];
  breakdown?: { label: string; rows: GroupBreakdown[] };
  groupOf?: (m: RegisterMember) => string;
  filename: string;
}) {
  const { titleLines, members, breakdown, groupOf, filename } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = "PRETAG AMIS";
  const used = new Set<string>();

  if (breakdown && breakdown.rows.length > 0) {
    const summary = wb.addWorksheet(sheetName("Summary", used));
    titleLines.forEach((line, i) => {
      summary.addRow([line]).font = i === 0 ? { bold: true, size: 14 } : { bold: i === 1, italic: i > 1, size: i === 1 ? 12 : 11 };
    });
    summary.addRow([]);
    summary.addRow(["Total members", members.length]).font = { bold: true };
    summary.addRow([`Number of ${breakdown.label.toLowerCase()}s`, breakdown.rows.length]).font = { bold: true };
    summary.addRow([]);
    const sumHeader = summary.addRow([breakdown.label.toUpperCase(), "MEMBERS"]);
    styleHeaderRow(sumHeader);
    for (const r of breakdown.rows) summary.addRow([r.name, r.count]);
    summary.getColumn(1).width = autoWidth([breakdown.label.toUpperCase(), ...breakdown.rows.map((r) => r.name)]);
    summary.getColumn(2).width = 14;
  }

  writeMemberSheet(wb, "All Members", titleLines, members, used);

  if (groupOf && breakdown) {
    for (const r of breakdown.rows) {
      writeMemberSheet(
        wb,
        r.name,
        [...titleLines.slice(0, 2), `${breakdown.label}: ${r.name}  ·  ${titleLines[titleLines.length - 1]}`],
        members.filter((m) => groupOf(m) === r.name),
        used,
      );
    }
  }

  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), filename };
}

function registerWordDoc(opts: {
  headerLine: string;
  heading1: string;
  heading2?: string;
  periodLabel: string;
  totalLine: string;
  sections: { heading: string; members: RegisterMember[] }[];
  docTitle: string;
}) {
  const { headerLine, heading1, heading2, periodLabel, totalLine, sections, docTitle } = opts;

  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "PRETAG ASHANTI REGION  ·  ", bold: true, size: 16, color: BRAND_RED }),
          new TextRun({ text: `${headerLine}  ·  R20 PERIOD: ${periodLabel.toUpperCase()}`, size: 16 }),
        ],
      }),
    ],
  });
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Pre-Tertiary Teachers Association of Ghana - Ashanti Region  ·  Page ", size: 14, color: "666666" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "666666" }),
          new TextRun({ text: " of ", size: 14, color: "666666" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "666666" }),
        ],
      }),
    ],
  });

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "PRETAG ASHANTI REGION", bold: true, size: 32, color: BRAND_RED })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(heading1.toUpperCase())],
    }),
  ];
  if (heading2) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: heading2.toUpperCase(), bold: true, size: 22 })],
      }),
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "MEMBERSHIP REGISTER", bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `R20 PERIOD: ${periodLabel.toUpperCase()}`, italics: true, size: 20 })],
    }),
    new Paragraph({ children: [new TextRun({ text: totalLine, bold: true, size: 20 })] }),
    new Paragraph({ text: "" }),
  );

  for (const s of sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 260, after: 100 },
        children: [new TextRun({ text: s.heading.toUpperCase(), bold: true, color: BRAND_RED })],
      }),
      memberTable(s.members),
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({
            text: `Total: ${s.members.length} member${s.members.length === 1 ? "" : "s"}`,
            italics: true,
            size: 18,
          }),
        ],
      }),
    );
  }

  return new Document({
    creator: "PRETAG AMIS",
    title: docTitle,
    sections: [
      {
        properties: { page: { size: A4_LANDSCAPE } },
        headers: { default: header },
        footers: { default: footer },
        children,
      },
    ],
  });
}

const fileSafe = (s: string) => s.replace(/\s+/g, "_").toUpperCase();

export type DistrictRegister = {
  zoneId: number;
  zoneName: string;
  districtId: number;
  districtName: string;
  periodLabel: string;
  members: RegisterMember[];
  units: GroupBreakdown[];
};

export async function getDistrictRegister(periodId: number, districtId: number, periodLabel: string): Promise<DistrictRegister> {
  const { data: district } = await createClient()
    .from("districts")
    .select("district_name, zone_id, zones(zone_name)")
    .eq("id", districtId)
    .single();
  if (!district) throw new Error("District not found");

  const rows = await fetchScopedSnapshots(periodId, { districtId });
  const members: RegisterMember[] = rows.map((r) => ({
    employeeNo: r.employee_no,
    name: r.employee_name ?? "",
    managementUnit: r.management_unit ?? "",
    district: r.districts?.district_name ?? district.district_name,
  }));
  members.sort(compareMembers);

  const unitCounts = new Map<string, number>();
  for (const m of members) unitCounts.set(m.managementUnit, (unitCounts.get(m.managementUnit) ?? 0) + 1);
  const units = [...unitCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)));

  return {
    zoneId: district.zone_id,
    zoneName: (district.zones as unknown as { zone_name?: string } | null)?.zone_name ?? "",
    districtId,
    districtName: district.district_name,
    periodLabel,
    members,
    units,
  };
}

export async function buildDistrictRegisterExcel(r: DistrictRegister) {
  const titleLines = [
    "PRETAG ASHANTI REGION",
    `${r.districtName.toUpperCase()} DISTRICT (${r.zoneName.toUpperCase()} ZONE) - MEMBERSHIP REGISTER`,
    `R20 Period: ${r.periodLabel}`,
  ];
  return buildRegisterWorkbook({
    titleLines,
    members: r.members,
    breakdown: { label: "Management Unit", rows: r.units },
    groupOf: (m) => m.managementUnit,
    filename: `PRETAG_${fileSafe(r.districtName)}_MEMBERSHIP_REGISTER_${fileSafe(r.periodLabel)}.xlsx`,
  });
}

export async function buildDistrictRegisterWord(r: DistrictRegister) {
  const doc = registerWordDoc({
    headerLine: `${r.districtName.toUpperCase()} DISTRICT MEMBERSHIP REGISTER`,
    heading1: r.districtName,
    heading2: `${r.zoneName} Zone`,
    periodLabel: r.periodLabel,
    totalLine: `District total: ${r.members.length} member${r.members.length === 1 ? "" : "s"} across ${r.units.length} management unit${r.units.length === 1 ? "" : "s"}.`,
    sections: r.units.map((u) => ({
      heading: `Management Unit: ${u.name || "(not recorded)"}`,
      members: r.members.filter((m) => m.managementUnit === u.name),
    })),
    docTitle: `${r.districtName} Membership Register - ${r.periodLabel}`,
  });
  return {
    buffer: await Packer.toBuffer(doc),
    filename: `PRETAG_${fileSafe(r.districtName)}_MEMBERSHIP_REGISTER_${fileSafe(r.periodLabel)}.docx`,
  };
}

export type UnitRegister = {
  zoneId: number;
  zoneName: string;
  districtId: number;
  districtName: string;
  unitName: string;
  periodLabel: string;
  members: RegisterMember[];
};

export async function getUnitRegister(
  periodId: number,
  districtId: number,
  unitName: string,
  periodLabel: string,
): Promise<UnitRegister> {
  const { data: district } = await createClient()
    .from("districts")
    .select("district_name, zone_id, zones(zone_name)")
    .eq("id", districtId)
    .single();
  if (!district) throw new Error("District not found");

  const rows = await fetchScopedSnapshots(periodId, { districtId });
  const members: RegisterMember[] = rows
    .filter((r) => (r.management_unit ?? "") === unitName)
    .map((r) => ({
      employeeNo: r.employee_no,
      name: r.employee_name ?? "",
      managementUnit: r.management_unit ?? "",
      district: r.districts?.district_name ?? district.district_name,
    }))
    .sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)));

  return {
    zoneId: district.zone_id,
    zoneName: (district.zones as unknown as { zone_name?: string } | null)?.zone_name ?? "",
    districtId,
    districtName: district.district_name,
    unitName,
    periodLabel,
    members,
  };
}

export async function buildUnitRegisterExcel(r: UnitRegister) {
  const titleLines = [
    "PRETAG ASHANTI REGION",
    `${r.unitName.toUpperCase() || "(NOT RECORDED)"} - MEMBERSHIP REGISTER`,
    `${r.districtName} District, ${r.zoneName} Zone  ·  R20 Period: ${r.periodLabel}`,
  ];
  return buildRegisterWorkbook({
    titleLines,
    members: r.members,
    filename: `PRETAG_${fileSafe(r.unitName || "UNRECORDED_UNIT")}_MEMBERSHIP_REGISTER_${fileSafe(r.periodLabel)}.xlsx`,
  });
}

export async function buildUnitRegisterWord(r: UnitRegister) {
  const doc = registerWordDoc({
    headerLine: `${r.unitName.toUpperCase() || "(NOT RECORDED)"} MEMBERSHIP REGISTER`,
    heading1: r.unitName || "(not recorded)",
    heading2: `${r.districtName} District, ${r.zoneName} Zone`,
    periodLabel: r.periodLabel,
    totalLine: `Total: ${r.members.length} member${r.members.length === 1 ? "" : "s"}.`,
    sections: [{ heading: r.unitName || "(not recorded)", members: r.members }],
    docTitle: `${r.unitName} Membership Register - ${r.periodLabel}`,
  });
  return {
    buffer: await Packer.toBuffer(doc),
    filename: `PRETAG_${fileSafe(r.unitName || "UNRECORDED_UNIT")}_MEMBERSHIP_REGISTER_${fileSafe(r.periodLabel)}.docx`,
  };
}

/** Server-side scope checks for the printable registers (same rules as the
 *  zonal export route): region users reach everything, a Zone Executive only
 *  their zone and its districts, a District Executive only their district. */
export function zoneInScope(zoneId: number, scope: ZonalScope) {
  if (scope.level === "region") return true;
  return scope.level === "zone" && scope.zoneId === zoneId;
}

export async function districtInScope(districtId: number, scope: ZonalScope) {
  if (scope.level === "region") return true;
  if (scope.level === "district") return scope.districtId === districtId;
  const { data } = await createClient().from("districts").select("zone_id").eq("id", districtId).single();
  return data?.zone_id === scope.zoneId;
}
