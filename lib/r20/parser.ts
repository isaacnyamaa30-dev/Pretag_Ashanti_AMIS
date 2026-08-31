/**
 * R20 workbook parser + validator. TypeScript port of analyzer/parser.py.
 * Handles both a flat Regional R20 and a multi-sheet zone workbook, and absorbs
 * the quirks in docs/build-plan.html section 2.
 */
import ExcelJS from "exceljs";
import { cleanName, employeeNoToText, normText } from "./normalize";
import type { Resolver } from "./mapping";

export const REQUIRED_HEADERS = [
  "EMPLOYEE NO",
  "NAME OF EMPLOYEE",
  "MANAGEMENT UNIT",
  "DISTRICT",
  "REGION",
];
const REGION_CANON = "ashanti";

export type ParsedRow = {
  sheet: string;
  excelRow: number;
  employeeNo: string;
  name: string;
  managementUnit: string;
  rawDistrict: string;
  rawRegion: string;
  districtId: number | null;
  zoneId: number | null;
  status: "valid" | "warning" | "error";
  message: string | null;
};

export type ParseResult = {
  sheetsRead: string[];
  sheetsSkipped: string[];
  blankRowsDropped: number;
  rows: ParsedRow[];
};

export type ValidationSummary = {
  totalRows: number;
  validRows: number;
  blankRowsDropped: number;
  missingEmployeeNo: number;
  duplicateEmployeeNos: number;
  unmappedRows: number;
  unmappedDistricts: { district: string; count: number }[];
  sheetsRead: string[];
  sheetsSkipped: string[];
  status: "validated" | "needs_review";
};

function cellText(cell: ExcelJS.Cell | undefined): unknown {
  if (!cell) return null;
  const v = cell.value;
  if (v && typeof v === "object") {
    if ("text" in v) return (v as { text: string }).text;
    if ("result" in v) return (v as { result: unknown }).result;
    if ("richText" in v)
      return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
  }
  return v;
}

// How many rows / leading columns to probe when locating the header. Some R20s
// carry a leading serial-number column or a blank/title row above the headers.
const HEADER_SCAN_ROWS = 15;
const HEADER_SCAN_COLS = 4;

function matchHeaderAt(row: ExcelJS.Row, colOffset: number): boolean {
  for (let i = 0; i < 5; i++) {
    if (normText(cellText(row.getCell(colOffset + 1 + i))).toUpperCase() !== REQUIRED_HEADERS[i]) {
      return false;
    }
  }
  return true;
}

/** Locate the R20 header: returns {headerRow, colOffset} or null. */
function findHeader(ws: ExcelJS.Worksheet): { headerRow: number; colOffset: number } | null {
  const last = Math.min(HEADER_SCAN_ROWS, ws.rowCount || HEADER_SCAN_ROWS);
  for (let r = 1; r <= last; r++) {
    const row = ws.getRow(r);
    for (let c = 0; c <= HEADER_SCAN_COLS; c++) {
      if (matchHeaderAt(row, c)) return { headerRow: r, colOffset: c };
    }
  }
  return null;
}

export async function parseWorkbook(buffer: ArrayBuffer | Buffer): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  // ExcelJS accepts a Node Buffer or ArrayBuffer; the cast sidesteps a
  // @types/node Buffer-generic mismatch.
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);

  const rows: ParsedRow[] = [];
  const sheetsRead: string[] = [];
  const sheetsSkipped: string[] = [];
  let blankRowsDropped = 0;

  wb.eachSheet((ws) => {
    const title = normText(ws.name);
    const header = findHeader(ws);
    if (!header) {
      if (title) sheetsSkipped.push(ws.name);
      return;
    }
    sheetsRead.push(title);
    const { headerRow, colOffset } = header;
    const cols = [1, 2, 3, 4, 5].map((n) => colOffset + n);

    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRow) return;
      const values = cols.map((c) => cellText(row.getCell(c)));
      if (values.every((v) => v === null || v === undefined || String(v).trim() === "")) {
        blankRowsDropped += 1;
        return;
      }
      rows.push({
        sheet: title,
        excelRow: rowNumber,
        employeeNo: employeeNoToText(values[0]),
        name: cleanName(values[1]),
        managementUnit: normText(values[2]),
        rawDistrict: normText(values[3]),
        rawRegion: normText(values[4]),
        districtId: null,
        zoneId: null,
        status: "valid",
        message: null,
      });
    });
  });

  return { sheetsRead, sheetsSkipped, blankRowsDropped, rows };
}

/** Attach mapping + validation to parsed rows in place, and return the summary. */
export function validate(parsed: ParseResult, resolver: Resolver): ValidationSummary {
  const problems = (r: ParsedRow, msg: string, level: "warning" | "error" = "error") => {
    r.status = r.status === "error" ? "error" : level;
    r.message = r.message ? `${r.message}; ${msg}` : msg;
  };

  const seen = new Map<string, ParsedRow>();
  const unmapped = new Map<string, number>();

  for (const r of parsed.rows) {
    if (!r.employeeNo) problems(r, "missing employee number");
    if (!r.name) problems(r, "missing name", "warning");

    const d = r.rawDistrict ? resolver.resolve(r.rawDistrict) : null;
    if (d) {
      r.districtId = d.districtId;
      r.zoneId = d.zoneId;
    } else {
      problems(r, `unmapped district: ${r.rawDistrict || "(blank)"}`);
      unmapped.set(r.rawDistrict, (unmapped.get(r.rawDistrict) ?? 0) + 1);
    }

    if (r.rawRegion && r.rawRegion.toLowerCase() !== REGION_CANON) {
      problems(r, `unexpected region: ${r.rawRegion}`, "warning");
    }

    if (r.employeeNo) {
      const prev = seen.get(r.employeeNo);
      if (prev) {
        problems(r, "duplicate employee number");
        problems(prev, "duplicate employee number");
      } else {
        seen.set(r.employeeNo, r);
      }
    }
  }

  const missingEmployeeNo = parsed.rows.filter((r) => !r.employeeNo).length;
  const dupCount = new Set(
    parsed.rows.filter((r) => r.message?.includes("duplicate employee number")).map((r) => r.employeeNo),
  ).size;
  const unmappedRows = [...unmapped.values()].reduce((a, b) => a + b, 0);
  const validRows = parsed.rows.filter((r) => r.status === "valid").length;

  return {
    totalRows: parsed.rows.length,
    validRows,
    blankRowsDropped: parsed.blankRowsDropped,
    missingEmployeeNo,
    duplicateEmployeeNos: dupCount,
    unmappedRows,
    unmappedDistricts: [...unmapped.entries()]
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count),
    sheetsRead: parsed.sheetsRead,
    sheetsSkipped: parsed.sheetsSkipped,
    status:
      missingEmployeeNo || unmappedRows || dupCount ? "needs_review" : "validated",
  };
}
