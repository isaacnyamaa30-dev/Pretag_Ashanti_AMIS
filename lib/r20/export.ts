/**
 * R20 export (build-plan Phase 6). Regenerates the Regional workbook, each of
 * the 18 zone workbooks (one sheet per district, matching the supplied format),
 * and a ZIP of all zones - for any imported period, straight from
 * membership_snapshots.
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
} from "docx";
import { createClient } from "@/lib/supabase/server";
import { getImportedPeriods } from "@/lib/analytics";
import { buildExecutiveReport } from "@/lib/reports";
import { PdfReport } from "@/lib/pdf";
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

export async function buildComparisonWorkbook(
  prevId: number,
  curId: number,
  prevLabel: string,
  curLabel: string,
) {
  const supabase = createClient();
  const [{ data: zoneRows }, { data: distRows }, { data: added }, { data: missing }, { data: transfers }] =
    await Promise.all([
      supabase.rpc("compare_periods", { p_prev: prevId, p_cur: curId }),
      supabase.rpc("compare_districts", { p_prev: prevId, p_cur: curId }),
      supabase.rpc("period_movers", { p_prev: prevId, p_cur: curId, p_kind: "added" }),
      supabase.rpc("period_movers", { p_prev: prevId, p_cur: curId, p_kind: "missing" }),
      supabase.rpc("period_movers", { p_prev: prevId, p_cur: curId, p_kind: "transfer" }),
    ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "PRETAG AMIS";

  const region = (zoneRows ?? []).find((r: Record<string, unknown>) => r.level === "region");
  const ov = wb.addWorksheet("Overview");
  ov.addRow(["PRETAG Ashanti - Membership Comparison"]);
  ov.getRow(1).font = { bold: true, size: 14 };
  ov.addRow([]);
  ov.addRow(["From", prevLabel]);
  ov.addRow(["To", curLabel]);
  ov.addRow([]);
  if (region) {
    for (const [k, label] of [
      ["previous", "Opening membership"], ["current", "Closing membership"],
      ["added", "Added to current R20"], ["missing", "Missing from current R20"],
    ] as const) {
      ov.addRow([label, Number((region as Record<string, unknown>)[k])]);
    }
    const net = Number(region.current) - Number(region.previous);
    ov.addRow(["Net change", net]);
    ov.addRow(["Growth %", Number(region.previous) ? Math.round((net / Number(region.previous)) * 10000) / 100 : "n/a"]);
  }
  ov.getColumn(1).width = 28;
  ov.getColumn(2).width = 18;

  const zoneHead = ["Area", "Previous", "Current", "Added", "Missing", "Transfers in", "Transfers out", "Net", "Growth %"];
  const zs = wb.addWorksheet("Zones");
  zs.addRow(zoneHead);
  for (const r of (zoneRows ?? []).filter((x: Record<string, unknown>) => x.level === "zone")) {
    const prev = Number(r.previous);
    const cur = Number(r.current);
    zs.addRow([r.name, prev, cur, Number(r.added), Number(r.missing), Number(r.transfers_in), Number(r.transfers_out), cur - prev, prev ? Math.round(((cur - prev) / prev) * 10000) / 100 : "n/a"]);
  }

  const ds = wb.addWorksheet("Districts");
  ds.addRow(["District", "Zone", ...zoneHead.slice(1)]);
  for (const r of distRows ?? []) {
    const prev = Number(r.previous);
    const cur = Number(r.current);
    if (prev === 0 && cur === 0) continue;
    ds.addRow([r.name, r.zone_name, prev, cur, Number(r.added), Number(r.missing), Number(r.transfers_in), Number(r.transfers_out), cur - prev, prev ? Math.round(((cur - prev) / prev) * 10000) / 100 : "n/a"]);
  }

  for (const [name, rows] of [["Added", added], ["No longer in R20", missing], ["Moved", transfers]] as const) {
    const ws = wb.addWorksheet(name);
    ws.addRow(["Employee no", "Name", "Management unit", "From zone", "To zone", "From district", "To district"]);
    for (const m of rows ?? []) {
      ws.addRow([m.employee_no, m.name, m.management_unit, m.from_zone, m.to_zone, m.from_district, m.to_district]);
    }
  }

  for (const ws of wb.worksheets) {
    ws.getRow(1).font = { bold: true };
    ws.columns.forEach((c) => {
      c.width = Math.max(c.width ?? 10, 14);
    });
  }

  return {
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    filename: `PRETAG_ASHANTI_COMPARISON_${prevLabel.replace(/\s+/g, "_")}_to_${curLabel.replace(/\s+/g, "_")}.xlsx`.toUpperCase(),
  };
}

type MoverRow = {
  employee_no: string;
  name: string | null;
  management_unit: string | null;
  from_zone: string | null;
  to_zone: string | null;
  from_district: string | null;
  to_district: string | null;
};

/** Every mover of one kind between two periods, sorted by zone then district
 *  then name, with helpers for the "which side" fields. Paged so a month that
 *  loses or gains more than 1000 members still comes back whole. */
async function fetchMovers(kind: "added" | "missing", prevId: number, curId: number) {
  const supabase = createClient();
  const rows: MoverRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .rpc("period_movers", { p_prev: prevId, p_cur: curId, p_kind: kind })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as MoverRow[]));
    if (!data || data.length < 1000) break;
  }
  const leavers = kind === "missing";
  const zoneOf = (r: MoverRow) => (leavers ? r.from_zone : r.to_zone) ?? "Unassigned";
  const districtOf = (r: MoverRow) => (leavers ? r.from_district : r.to_district) ?? "Unassigned";
  rows.sort(
    (a, b) =>
      zoneOf(a).localeCompare(zoneOf(b)) ||
      districtOf(a).localeCompare(districtOf(b)) ||
      (a.name ?? "").localeCompare(b.name ?? ""),
  );
  return { rows, leavers, zoneOf, districtOf };
}

function moversFilename(ext: string, leavers: boolean, prevLabel: string, curLabel: string) {
  const tag = leavers ? "LEFT_THE_R20" : "NEW_MEMBERS";
  return `PRETAG_ASHANTI_${tag}_${prevLabel.replace(/\s+/g, "_")}_to_${curLabel.replace(
    /\s+/g,
    "_",
  )}.${ext}`.toUpperCase();
}

/**
 * Follow-up workbook for the regional executives: every member who left the R20
 * (in the previous month, not the current) or joined it (in the current month,
 * not the previous), with their full R20 details, sorted by zone then district.
 */
export async function buildMoversWorkbook(
  kind: "added" | "missing",
  prevId: number,
  curId: number,
  prevLabel: string,
  curLabel: string,
) {
  const { rows, leavers, zoneOf, districtOf } = await fetchMovers(kind, prevId, curId);

  const wb = new ExcelJS.Workbook();
  wb.creator = "PRETAG AMIS";

  const s = wb.addWorksheet("Summary");
  s.addRow([leavers ? "Members no longer in the R20" : "New members in the R20"]);
  s.getRow(1).font = { bold: true, size: 14 };
  s.addRow([]);
  s.addRow(["Previous month", prevLabel]);
  s.addRow(["Current month", curLabel]);
  s.addRow([
    "Definition",
    leavers
      ? `Present in the ${prevLabel} Regional R20 but not in the ${curLabel} Regional R20.`
      : `Present in the ${curLabel} Regional R20 but not in the ${prevLabel} Regional R20.`,
  ]);
  s.addRow(["Total members", rows.length]);
  s.addRow(["Generated", new Date().toISOString().slice(0, 10)]);
  s.addRow([]);
  s.addRow([
    "This list shows appearances in the R20 return, not verified reasons for the change. " +
      "It is for executive follow-up and confirmation.",
  ]);
  s.addRow(["PRETAG Ashanti Membership Intelligence System - Developed by Saris IT Solution"]);
  s.getColumn(1).width = 20;
  s.getColumn(2).width = 72;

  const m = wb.addWorksheet("Members");
  const whenCol = leavers ? `Last in R20 (${prevLabel})` : `First in R20 (${curLabel})`;
  m.addRow([
    "#",
    "Employee No",
    "Full Name",
    "Management Unit",
    "District",
    "Zone",
    "Region",
    whenCol,
    "Followed up? (Y/N)",
    "Outcome / reason",
  ]);
  rows.forEach((r, i) => {
    m.addRow([
      i + 1,
      r.employee_no,
      r.name ?? "",
      r.management_unit ?? "",
      districtOf(r),
      zoneOf(r),
      "Ashanti",
      leavers ? prevLabel : curLabel,
      "",
      "",
    ]);
  });
  m.getRow(1).font = { bold: true };
  m.getRow(1).eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7EFD5" } };
  });
  m.columns = [
    { width: 5 },
    { width: 14 },
    { width: 34 },
    { width: 40 },
    { width: 24 },
    { width: 20 },
    { width: 10 },
    { width: 20 },
    { width: 18 },
    { width: 34 },
  ];
  m.views = [{ state: "frozen", ySplit: 1 }];
  m.autoFilter = "A1:J1";

  return {
    buffer: Buffer.from(await wb.xlsx.writeBuffer()),
    filename: moversFilename("xlsx", leavers, prevLabel, curLabel),
  };
}

/**
 * The same leaver / joiner follow-up list as a Word document - a landscape
 * table an executive can annotate and circulate. Real .docx via the `docx`
 * library, not an HTML shim.
 */
export async function buildMoversDoc(
  kind: "added" | "missing",
  prevId: number,
  curId: number,
  prevLabel: string,
  curLabel: string,
) {
  const { rows, leavers, zoneOf, districtOf } = await fetchMovers(kind, prevId, curId);

  const heads = [
    "#",
    "Employee No",
    "Full Name",
    "Management Unit",
    "District",
    "Zone",
    leavers ? `Last in R20` : `First in R20`,
    "Followed up? (Y/N)",
    "Outcome / reason",
  ];
  const widths = [4, 9, 20, 22, 13, 11, 9, 10, 20]; // percent

  const cell = (text: string, opts: { bold?: boolean; pct: number }) =>
    new TableCell({
      width: { size: opts.pct, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: opts.bold, size: 16 })],
        }),
      ],
    });

  const headerRow = new TableRow({
    tableHeader: true,
    children: heads.map((h, i) => cell(h, { bold: true, pct: widths[i] })),
  });

  const bodyRows = rows.map(
    (r, i) =>
      new TableRow({
        children: [
          String(i + 1),
          r.employee_no ?? "",
          r.name ?? "",
          r.management_unit ?? "",
          districtOf(r),
          zoneOf(r),
          leavers ? prevLabel : curLabel,
          "",
          "",
        ].map((v, c) => cell(v, { pct: widths[c] })),
      }),
  );

  const definition = leavers
    ? `Members present in the ${prevLabel} Regional R20 but not in the ${curLabel} Regional R20.`
    : `Members present in the ${curLabel} Regional R20 but not in the ${prevLabel} Regional R20.`;

  const doc = new Document({
    creator: "PRETAG AMIS",
    title: leavers ? "Members no longer in the R20" : "New members in the R20",
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Pre-Tertiary Teachers Association of Ghana - Ashanti Region",
                bold: true,
                size: 18,
              }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun(leavers ? "Members No Longer in the R20" : "New Members in the R20"),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: definition, size: 20 })] }),
          new Paragraph({
            children: [
              new TextRun({
                text: `${rows.length} member${rows.length === 1 ? "" : "s"}  ·  generated ${new Date().toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "long", year: "numeric" },
                )}`,
                size: 18,
                italics: true,
              }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...bodyRows],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({
                text:
                  "This list shows appearances in the R20 return, not verified reasons for the change - " +
                  "for executive follow-up and confirmation. " +
                  "PRETAG Ashanti Membership Intelligence System - Developed by Saris IT Solution - " +
                  "sarisitsolution@gmail.com / +233 24 117 6269.",
                size: 14,
                color: "666666",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return {
    buffer: await Packer.toBuffer(doc),
    filename: moversFilename("docx", leavers, prevLabel, curLabel),
  };
}

/**
 * The Executive (REC / NEC) report as an editable Word document: cover heading,
 * position table, the deterministic executive-summary paragraphs, month-by-month
 * movement, the zone league table and the districts of note. Built from the same
 * `buildExecutiveReport` data the on-screen report uses, so the two never drift.
 */
export async function buildExecutiveDoc(fromId: number, toId: number) {
  const periods = await getImportedPeriods();
  const r = await buildExecutiveReport(periods, fromId, toId);

  const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;
  const pct = (v: number | null) => (v === null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);

  const tcell = (text: string, opts: { bold?: boolean; pct: number; right?: boolean } = { pct: 20 }) =>
    new TableCell({
      width: { size: opts.pct, type: WidthType.PERCENTAGE },
      children: [
        new Paragraph({
          alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [new TextRun({ text, bold: opts.bold, size: 18 })],
        }),
      ],
    });

  const table = (headers: { text: string; pct: number; right?: boolean }[], body: string[][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: headers.map((h) => tcell(h.text, { bold: true, pct: h.pct, right: h.right })),
        }),
        ...body.map(
          (cells) =>
            new TableRow({
              children: cells.map((c, i) =>
                tcell(c, { pct: headers[i].pct, right: headers[i].right }),
              ),
            }),
        ),
      ],
    });

  const heading = (text: string) =>
    new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 }, children: [new TextRun(text)] });
  const para = (text: string, opts: { size?: number; italics?: boolean; color?: string } = {}) =>
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text, size: opts.size ?? 20, italics: opts.italics, color: opts.color })],
    });

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Pre-Tertiary Teachers Association of Ghana — Ashanti Region",
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(`Membership Report — ${r.name}`)],
    }),
    para(
      `Prepared for the Regional / National Executive Council. Covering ${r.span}. Generated ${new Date().toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "long", year: "numeric" },
      )}.`,
      { size: 18, italics: true },
    ),
  ];

  if (r.region) {
    children.push(heading("1. Position"));
    children.push(
      table(
        [
          { text: "Measure", pct: 60 },
          { text: "Value", pct: 40, right: true },
        ],
        [
          [`Opening membership (${r.from.label})`, r.region.previous.toLocaleString()],
          [`Closing membership (${r.to.label})`, r.region.current.toLocaleString()],
          ["Joined over the period", `+${r.region.added.toLocaleString()}`],
          ["Left over the period", `−${r.region.missing.toLocaleString()}`],
          ["Net change", signed(r.region.net)],
          ["Growth rate", pct(r.region.growth_pct)],
          [
            "Retention rate",
            r.region.retention_pct === null ? "n/a" : `${r.region.retention_pct.toFixed(2)}%`,
          ],
        ],
      ),
    );
  }

  if (r.summary) {
    children.push(heading("2. Executive summary"));
    children.push(para(r.summary));
    if (r.trajectory) children.push(para(r.trajectory));
  }

  if (r.steps.length > 0) {
    children.push(heading("3. Month by month"));
    children.push(
      table(
        [
          { text: "Step", pct: 50 },
          { text: "Net change", pct: 25, right: true },
          { text: "Growth", pct: 25, right: true },
        ],
        r.steps.map((s) => [`${s.from} → ${s.to}`, signed(s.net), pct(s.pct)]),
      ),
    );
    if (r.best && r.worst && r.steps.length >= 2) {
      children.push(
        para(
          `Strongest month: ${r.best.to} (${signed(r.best.net)}). Weakest month: ${r.worst.to} (${signed(
            r.worst.net,
          )}).`,
          { size: 18, italics: true },
        ),
      );
    }
  }

  if (r.zones.length > 0) {
    children.push(heading("4. Zone performance"));
    children.push(
      table(
        [
          { text: "Zone", pct: 34 },
          { text: "Opening", pct: 14, right: true },
          { text: "Closing", pct: 14, right: true },
          { text: "Net", pct: 12, right: true },
          { text: "Growth", pct: 14, right: true },
          { text: "Status", pct: 12 },
        ],
        r.zones.map((z) => [
          z.name,
          z.previous.toLocaleString(),
          z.current.toLocaleString(),
          signed(z.net),
          pct(z.growth_pct),
          z.status,
        ]),
      ),
    );
  }

  if (r.risingDistricts.length > 0 || r.fallingDistricts.length > 0) {
    children.push(heading("5. Districts of note"));
    if (r.risingDistricts.length > 0) {
      children.push(para("Largest gains", { size: 18, italics: true }));
      r.risingDistricts.forEach((d) =>
        children.push(para(`  ${d.name} (${d.zone_name})  ${signed(d.net)}`, { size: 18 })),
      );
    }
    if (r.fallingDistricts.length > 0) {
      children.push(para("Largest losses", { size: 18, italics: true }));
      r.fallingDistricts.forEach((d) =>
        children.push(para(`  ${d.name} (${d.zone_name})  ${signed(d.net)}`, { size: 18 })),
      );
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      children: [
        new TextRun({
          text:
            `Covers ${r.monthsCovered} imported month${r.monthsCovered === 1 ? "" : "s"} (${r.span}). ` +
            "Movement figures describe appearances in the monthly R20 return, not verified reasons for joining or leaving. " +
            "PRETAG Ashanti Membership Intelligence System — Developed by Saris IT Solution — " +
            "sarisitsolution@gmail.com / +233 24 117 6269.",
          size: 14,
          color: "666666",
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: "PRETAG AMIS",
    title: `Membership Report - ${r.name}`,
    sections: [{ children }],
  });

  const slug = r.name.replace(/[^\dA-Za-z]+/g, "_").replace(/^_|_$/g, "").toUpperCase();
  return {
    buffer: await Packer.toBuffer(doc),
    filename: `PRETAG_ASHANTI_EXECUTIVE_REPORT_${slug}.docx`,
  };
}

/** The Executive report as a genuine, server-generated PDF (pdf-lib). */
export async function buildExecutivePdf(fromId: number, toId: number) {
  const periods = await getImportedPeriods();
  const r = await buildExecutiveReport(periods, fromId, toId);

  const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${Math.abs(n)}`;
  const pct = (v: number | null) => (v === null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);

  const pdf = await PdfReport.create();
  pdf.title(
    `Membership Report - ${r.name}`,
    "Pre-Tertiary Teachers Association of Ghana - Ashanti Region",
  );
  pdf.paragraph(
    `Prepared for the Regional / National Executive Council. Covering ${r.span}. ` +
      `Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`,
    { size: 9, italic: true },
  );
  pdf.rule();

  if (r.region) {
    pdf.heading("1. Position");
    pdf.table(
      [
        { header: "Measure", width: 320 },
        { header: "Value", width: 175, align: "right" },
      ],
      [
        [`Opening membership (${r.from.label})`, r.region.previous.toLocaleString()],
        [`Closing membership (${r.to.label})`, r.region.current.toLocaleString()],
        ["Joined over the period", `+${r.region.added.toLocaleString()}`],
        ["Left over the period", `-${r.region.missing.toLocaleString()}`],
        ["Net change", signed(r.region.net)],
        ["Growth rate", pct(r.region.growth_pct)],
        [
          "Retention rate",
          r.region.retention_pct === null ? "n/a" : `${r.region.retention_pct.toFixed(2)}%`,
        ],
      ],
    );
  }

  if (r.summary) {
    pdf.heading("2. Executive summary");
    pdf.paragraph(r.summary);
    if (r.trajectory) pdf.paragraph(r.trajectory);
  }

  if (r.steps.length > 0) {
    pdf.heading("3. Month by month");
    pdf.table(
      [
        { header: "Step", width: 255 },
        { header: "Net change", width: 120, align: "right" },
        { header: "Growth", width: 120, align: "right" },
      ],
      r.steps.map((s) => [`${s.from} - ${s.to}`, signed(s.net), pct(s.pct)]),
    );
    if (r.best && r.worst && r.steps.length >= 2) {
      pdf.paragraph(
        `Strongest month: ${r.best.to} (${signed(r.best.net)}). Weakest month: ${r.worst.to} (${signed(r.worst.net)}).`,
        { size: 9, italic: true },
      );
    }
  }

  if (r.zones.length > 0) {
    pdf.heading("4. Zone performance");
    pdf.table(
      [
        { header: "Zone", width: 155 },
        { header: "Opening", width: 65, align: "right" },
        { header: "Closing", width: 65, align: "right" },
        { header: "Net", width: 55, align: "right" },
        { header: "Growth", width: 75, align: "right" },
        { header: "Status", width: 80 },
      ],
      r.zones.map((z) => [
        z.name,
        z.previous.toLocaleString(),
        z.current.toLocaleString(),
        signed(z.net),
        pct(z.growth_pct),
        z.status,
      ]),
    );
  }

  if (r.risingDistricts.length > 0 || r.fallingDistricts.length > 0) {
    pdf.heading("5. Districts of note");
    if (r.risingDistricts.length > 0) {
      pdf.paragraph("Largest gains", { size: 9, italic: true });
      pdf.paragraph(
        r.risingDistricts.map((d) => `${d.name} (${d.zone_name})  ${signed(d.net)}`).join("\n"),
        { size: 9 },
      );
    }
    if (r.fallingDistricts.length > 0) {
      pdf.paragraph("Largest losses", { size: 9, italic: true });
      pdf.paragraph(
        r.fallingDistricts.map((d) => `${d.name} (${d.zone_name})  ${signed(d.net)}`).join("\n"),
        { size: 9 },
      );
    }
  }

  pdf.footnote(
    `Covers ${r.monthsCovered} imported month${r.monthsCovered === 1 ? "" : "s"} (${r.span}). ` +
      "Movement figures describe appearances in the monthly R20 return, not verified reasons for joining or leaving. " +
      "PRETAG Ashanti Membership Intelligence System - Developed by Saris IT Solution - " +
      "sarisitsolution@gmail.com / +233 24 117 6269.",
  );

  const slug = r.name.replace(/[^\dA-Za-z]+/g, "_").replace(/^_|_$/g, "").toUpperCase();
  return {
    buffer: await pdf.toBuffer(),
    filename: `PRETAG_ASHANTI_EXECUTIVE_REPORT_${slug}.pdf`,
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
