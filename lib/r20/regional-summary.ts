/**
 * Regional Membership Summary - every zone's and every district's member count
 * for one approved R20 period, with reconciliation checks, plus its Excel and
 * Word exports. Read-only: nothing here writes membership data.
 *
 * Counting rule: a district's total is the number of distinct employee numbers
 * whose snapshot is assigned to that district. A zone's total is the sum of the
 * districts currently assigned to it, so "zone = sum of districts" always holds.
 * Anything that does not fit cleanly (no zone / district on the snapshot, a
 * snapshot zone that disagrees with the district's zone, an employee number
 * appearing twice) is counted and reported as an issue, never silently moved.
 */
import ExcelJS from "exceljs";
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { createClient } from "@/lib/supabase/server";
import { BRAND_RED, autoWidth, sheetName, sortKey, styleHeaderRow } from "./zonal-export";

export type SummaryDistrict = { id: number; name: string; members: number };
export type SummaryZone = { id: number; name: string; members: number; districts: SummaryDistrict[] };
export type SummaryChecks = {
  regionEqualsZones: boolean;
  zonesEqualDistricts: boolean;
  /** snapshot rows with no zone or no district - excluded from every total */
  unmappedRows: number;
  /** employee numbers that appear more than once in the period */
  duplicateEmployeeNos: number;
  /** members whose snapshot zone differs from their district's current zone */
  zoneMismatches: { district: string; snapshotZone: string; currentZone: string; members: number }[];
};
export type RegionalSummary = {
  periodLabel: string;
  totalMembers: number;
  totalZones: number;
  configuredDistricts: number;
  districtsWithMembers: number;
  zones: SummaryZone[];
  checks: SummaryChecks;
};

const byName = (a: { name: string }, b: { name: string }) => sortKey(a.name).localeCompare(sortKey(b.name));

export async function getRegionalSummary(periodId: number, periodLabel: string): Promise<RegionalSummary> {
  const supabase = createClient();
  const [{ data: zoneRows, error: zErr }, { data: districtRows, error: dErr }] = await Promise.all([
    supabase.from("zones").select("id, zone_name").order("zone_name"),
    supabase.from("districts").select("id, district_name, zone_id").order("district_name"),
  ]);
  if (zErr) throw new Error(zErr.message);
  if (dErr) throw new Error(dErr.message);

  // every snapshot row of the period (paged - PostgREST caps a select at 1000)
  const rows: { employee_no: string; zone_id: number | null; district_id: number | null }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("membership_snapshots")
      .select("employee_no, zone_id, district_id")
      .eq("period_id", periodId)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const zoneName = new Map((zoneRows ?? []).map((z) => [z.id, z.zone_name as string]));
  const districtZone = new Map((districtRows ?? []).map((d) => [d.id, d.zone_id as number]));
  const districtName = new Map((districtRows ?? []).map((d) => [d.id, d.district_name as string]));

  const seen = new Map<string, number>();
  for (const r of rows) seen.set(r.employee_no, (seen.get(r.employee_no) ?? 0) + 1);
  const duplicateEmployeeNos = [...seen.values()].filter((n) => n > 1).length;

  const perDistrict = new Map<number, Set<string>>();
  const mismatch = new Map<string, number>();
  const regionMembers = new Set<string>();
  let unmappedRows = 0;
  for (const r of rows) {
    if (r.zone_id == null || r.district_id == null || !districtZone.has(r.district_id)) {
      unmappedRows += 1;
      continue;
    }
    const current = districtZone.get(r.district_id)!;
    if (current !== r.zone_id) {
      const k = `${r.district_id}|${r.zone_id}`;
      mismatch.set(k, (mismatch.get(k) ?? 0) + 1);
    }
    let set = perDistrict.get(r.district_id);
    if (!set) perDistrict.set(r.district_id, (set = new Set()));
    set.add(r.employee_no);
    regionMembers.add(r.employee_no);
  }

  const zones: SummaryZone[] = (zoneRows ?? [])
    .map((z) => {
      const districts = (districtRows ?? [])
        .filter((d) => d.zone_id === z.id)
        .map((d) => ({ id: d.id, name: d.district_name as string, members: perDistrict.get(d.id)?.size ?? 0 }))
        .sort(byName);
      return { id: z.id, name: z.zone_name as string, members: districts.reduce((n, d) => n + d.members, 0), districts };
    })
    .sort(byName);

  const zoneSum = zones.reduce((n, z) => n + z.members, 0);
  return {
    periodLabel,
    totalMembers: regionMembers.size,
    totalZones: zones.length,
    configuredDistricts: (districtRows ?? []).length,
    districtsWithMembers: zones.reduce((n, z) => n + z.districts.filter((d) => d.members > 0).length, 0),
    zones,
    checks: {
      regionEqualsZones: zoneSum === regionMembers.size,
      zonesEqualDistricts: zones.every((z) => z.members === z.districts.reduce((n, d) => n + d.members, 0)),
      unmappedRows,
      duplicateEmployeeNos,
      zoneMismatches: [...mismatch.entries()].map(([k, members]) => {
        const [dId, zId] = k.split("|").map(Number);
        return {
          district: districtName.get(dId) ?? `District ${dId}`,
          snapshotZone: zoneName.get(zId) ?? `Zone ${zId}`,
          currentZone: zoneName.get(districtZone.get(dId)!) ?? "",
          members,
        };
      }),
    },
  };
}

const fileSafe = (s: string) => s.replace(/\s+/g, "_").toUpperCase();
const n = (v: number) => v.toLocaleString("en-GB");

/* ------------------------------------------------------------------ Excel */

function boldRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((c) => {
    c.border = { top: { style: "thin" }, bottom: { style: "double" } };
  });
}

function titleBlock(ws: ExcelJS.Worksheet, lines: string[]) {
  lines.forEach((line, i) => {
    ws.addRow([line]).font = i === 0 ? { bold: true, size: 14, color: { argb: `FF${BRAND_RED}` } } : { bold: i === 1, italic: i > 1, size: i === 1 ? 12 : 11 };
  });
  ws.addRow([]);
}

export async function buildRegionalSummaryExcel(s: RegionalSummary) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PRETAG AMIS";
  const used = new Set<string>();

  // Sheet 1 - regional summary
  const sum = wb.addWorksheet(sheetName("Regional Summary", used));
  titleBlock(sum, ["PRETAG ASHANTI REGION", "REGIONAL MEMBERSHIP SUMMARY", `R20 Period: ${s.periodLabel}`]);
  for (const [k, v] of [
    ["Total regional membership", s.totalMembers],
    ["Total zones", s.totalZones],
    ["Total districts (configured)", s.configuredDistricts],
    ["Districts with members in this R20", s.districtsWithMembers],
  ] as const) {
    const r = sum.addRow([k, "", v]);
    r.font = { bold: true };
  }
  sum.addRow([]);
  styleHeaderRow(sum.addRow(["NO.", "ZONE", "NUMBER OF DISTRICTS", "TOTAL MEMBERS"]));
  s.zones.forEach((z, i) => sum.addRow([i + 1, z.name, z.districts.length, z.members]));
  boldRow(sum.addRow(["", "REGIONAL TOTAL", s.configuredDistricts, s.totalMembers]));
  sum.getColumn(1).width = 30;
  sum.getColumn(2).width = autoWidth(["REGIONAL TOTAL", ...s.zones.map((z) => z.name)], 16);
  sum.getColumn(3).width = 22;
  sum.getColumn(4).width = 16;

  // Sheet 2 - consolidated zone & district breakdown
  const br = wb.addWorksheet(sheetName("Zone & District Breakdown", used));
  titleBlock(br, ["PRETAG ASHANTI REGION", "ZONE & DISTRICT BREAKDOWN", `R20 Period: ${s.periodLabel}`]);
  const head = br.addRow(["NO.", "ZONE", "DISTRICT", "TOTAL MEMBERS"]);
  styleHeaderRow(head);
  let no = 0;
  for (const z of s.zones) {
    for (const d of z.districts) br.addRow([++no, z.name, d.name, d.members]);
    const sub = br.addRow(["", `${z.name.toUpperCase()} ZONE TOTAL`, "", z.members]);
    sub.font = { bold: true };
    sub.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7EFD5" } }));
  }
  boldRow(br.addRow(["", "REGIONAL GRAND TOTAL", "", s.totalMembers]));
  br.getColumn(1).width = 8;
  br.getColumn(2).width = autoWidth(["REGIONAL GRAND TOTAL", ...s.zones.map((z) => `${z.name.toUpperCase()} ZONE TOTAL`)], 16);
  br.getColumn(3).width = autoWidth(s.zones.flatMap((z) => z.districts.map((d) => d.name)), 16);
  br.getColumn(4).width = 16;
  br.views = [{ state: "frozen", ySplit: head.number }];

  // Sheets 3.. - one per zone
  for (const z of s.zones) {
    const ws = wb.addWorksheet(sheetName(z.name, used));
    titleBlock(ws, ["PRETAG ASHANTI REGION", `${z.name.toUpperCase()} ZONE - MEMBERSHIP SUMMARY`, `R20 Period: ${s.periodLabel}`]);
    ws.addRow(["Total zone membership", "", z.members]).font = { bold: true };
    ws.addRow(["Number of districts", "", z.districts.length]).font = { bold: true };
    ws.addRow([]);
    styleHeaderRow(ws.addRow(["NO.", "DISTRICT", "TOTAL MEMBERS"]));
    z.districts.forEach((d, i) => ws.addRow([i + 1, d.name, d.members]));
    boldRow(ws.addRow(["", `${z.name.toUpperCase()} ZONE TOTAL`, z.members]));
    ws.getColumn(1).width = 24;
    ws.getColumn(2).width = autoWidth([`${z.name.toUpperCase()} ZONE TOTAL`, ...z.districts.map((d) => d.name)], 16);
    ws.getColumn(3).width = 16;
  }

  return {
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    filename: `PRETAG_ASHANTI_REGIONAL_MEMBERSHIP_SUMMARY_${fileSafe(s.periodLabel)}.xlsx`,
  };
}

/* ------------------------------------------------------------------ Word */

function cell(text: string, opts: { header?: boolean; bold?: boolean; right?: boolean; pct: number; shade?: string }) {
  return new TableCell({
    width: { size: opts.pct, type: WidthType.PERCENTAGE },
    shading: opts.header
      ? { type: ShadingType.SOLID, color: BRAND_RED, fill: BRAND_RED }
      : opts.shade
        ? { type: ShadingType.SOLID, color: opts.shade, fill: opts.shade }
        : undefined,
    children: [
      new Paragraph({
        alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold || opts.header, size: 19, color: opts.header ? "FFFFFF" : undefined })],
      }),
    ],
  });
}

function table(widths: number[], head: string[], body: string[][], total?: string[]) {
  const numeric = (i: number) => i === 0 || i >= head.length - 2;
  const rows = [
    new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, { header: true, pct: widths[i], right: numeric(i) && i > 0 })) }),
    ...body.map((r) => new TableRow({ cantSplit: true, children: r.map((v, i) => cell(v, { pct: widths[i], right: numeric(i) && i > 0 })) })),
  ];
  if (total) {
    rows.push(new TableRow({ cantSplit: true, children: total.map((v, i) => cell(v, { pct: widths[i], bold: true, shade: "F7EFD5", right: numeric(i) && i > 0 })) }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

export async function buildRegionalSummaryWord(s: RegionalSummary) {
  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "PRETAG ASHANTI REGION  ·  ", bold: true, size: 16, color: BRAND_RED }),
          new TextRun({ text: `REGIONAL MEMBERSHIP SUMMARY  ·  R20 PERIOD: ${s.periodLabel.toUpperCase()}`, size: 16 }),
        ],
      }),
    ],
  });
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `Pre-Tertiary Teachers Association of Ghana - Ashanti Region  ·  R20 Period: ${s.periodLabel}  ·  Page `, size: 14, color: "666666" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "666666" }),
          new TextRun({ text: " of ", size: 14, color: "666666" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "666666" }),
        ],
      }),
    ],
  });

  const children: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PRETAG ASHANTI REGION", bold: true, size: 32, color: BRAND_RED })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun("REGIONAL MEMBERSHIP SUMMARY")] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: `R20 PERIOD: ${s.periodLabel.toUpperCase()}`, italics: true, size: 22 })],
    }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "1. REGIONAL MEMBERSHIP OVERVIEW", color: BRAND_RED })] }),
    table(
      [70, 30],
      ["ITEM", "VALUE"],
      [
        ["Total regional membership", n(s.totalMembers)],
        ["Total zones", String(s.totalZones)],
        ["Total districts (configured)", String(s.configuredDistricts)],
        ["Districts with members in this R20", String(s.districtsWithMembers)],
      ],
    ),
    new Paragraph({ text: "" }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "2. SUMMARY OF ALL ZONES", color: BRAND_RED })] }),
    table(
      [10, 50, 20, 20],
      ["NO.", "ZONE", "NUMBER OF DISTRICTS", "TOTAL MEMBERS"],
      s.zones.map((z, i) => [String(i + 1), z.name, String(z.districts.length), n(z.members)]),
      ["", "REGIONAL TOTAL", String(s.configuredDistricts), n(s.totalMembers)],
    ),
    new Paragraph({ text: "" }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "3. DISTRICT BREAKDOWN BY ZONE", color: BRAND_RED })] }),
  ];

  for (const z of s.zones) {
    children.push(
      new Paragraph({
        keepNext: true,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: `ZONE: ${z.name.toUpperCase()}`, bold: true, color: BRAND_RED, size: 22 })],
      }),
      table(
        [10, 65, 25],
        ["NO.", "DISTRICT", "TOTAL MEMBERS"],
        z.districts.map((d, i) => [String(i + 1), d.name, n(d.members)]),
        ["", `${z.name.toUpperCase()} ZONE TOTAL`, n(z.members)],
      ),
    );
  }
  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      spacing: { before: 240 },
      children: [new TextRun({ text: `REGIONAL GRAND TOTAL: ${n(s.totalMembers)} MEMBERS ACROSS ${s.totalZones} ZONES`, bold: true, size: 24, color: BRAND_RED })],
    }),
  );

  const doc = new Document({
    creator: "PRETAG AMIS",
    title: `Regional Membership Summary - ${s.periodLabel}`,
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 } } }, headers: { default: header }, footers: { default: footer }, children }],
  });
  return {
    buffer: await Packer.toBuffer(doc),
    filename: `PRETAG_ASHANTI_REGIONAL_MEMBERSHIP_SUMMARY_${fileSafe(s.periodLabel)}.docx`,
  };
}
