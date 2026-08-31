"""R20 workbook parser + validator for PRETAG AMIS.

Handles both shapes seen in real files:
  * a flat Regional R20 (one sheet of members)
  * a zone workbook (one sheet per district)

Absorbs the quirks catalogued in docs/build-plan.html section 2:
dirty sheet names, ghost rows, blank rows, trailing empty columns, unused
Sheet2/Sheet3, numeric employee-number cells, double spaces in names.
"""
from __future__ import annotations
import hashlib, os, re
from dataclasses import dataclass, field

import openpyxl

from .mapping import Mapping, norm_text

REQUIRED_HEADERS = ["EMPLOYEE NO", "NAME OF EMPLOYEE", "MANAGEMENT UNIT", "DISTRICT", "REGION"]
REGION_CANON = "Ashanti"


def _clean_name(s: str) -> str:
    return re.sub(r"\s+", " ", norm_text(s)).strip()


def _emp_to_text(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return re.sub(r"\s+", "", str(v)).strip()


@dataclass
class Row:
    sheet: str
    excel_row: int
    employee_no: str
    name: str
    management_unit: str
    raw_district: str
    raw_region: str
    district: str | None = None
    zone: str | None = None
    problems: list[str] = field(default_factory=list)


@dataclass
class ParseResult:
    path: str
    file_hash: str
    sheets_read: list[str]
    sheets_skipped: list[str]
    rows: list[Row]
    blank_rows_dropped: int

    # ---- derived views -------------------------------------------------
    @property
    def valid(self) -> list[Row]:
        return [r for r in self.rows if not r.problems]

    @property
    def duplicates(self) -> dict[str, list[Row]]:
        by_emp: dict[str, list[Row]] = {}
        for r in self.rows:
            if r.employee_no:
                by_emp.setdefault(r.employee_no, []).append(r)
        return {e: rs for e, rs in by_emp.items() if len(rs) > 1}

    @property
    def missing_employee_no(self) -> list[Row]:
        return [r for r in self.rows if not r.employee_no]

    @property
    def unmapped(self) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in self.rows:
            if r.zone is None and r.raw_district:
                out[r.raw_district] = out.get(r.raw_district, 0) + 1
        return dict(sorted(out.items(), key=lambda kv: -kv[1]))

    def summary(self) -> dict:
        return {
            "file": os.path.basename(self.path),
            "file_hash": self.file_hash[:12],
            "sheets_read": len(self.sheets_read),
            "sheets_skipped": self.sheets_skipped,
            "total_member_rows": len(self.rows),
            "valid_rows": len(self.valid),
            "blank_rows_dropped": self.blank_rows_dropped,
            "missing_employee_no": len(self.missing_employee_no),
            "duplicate_employee_nos": len(self.duplicates),
            "unmapped_districts": len(self.unmapped),
            "unmapped_detail": self.unmapped,
            "status": self._status(),
        }

    def _status(self) -> str:
        if self.missing_employee_no or self.unmapped or self.duplicates:
            return "NEEDS REVIEW"
        return "VALIDATED"


def _header_index(cells) -> bool:
    got = [norm_text(c).upper() for c in list(cells)[:5]]
    return got == REQUIRED_HEADERS


def parse(path: str, mapping: Mapping | None = None) -> ParseResult:
    mapping = mapping or Mapping()
    with open(path, "rb") as fh:
        file_hash = hashlib.sha256(fh.read()).hexdigest()

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows: list[Row] = []
    read, skipped = [], []
    blank_dropped = 0

    for ws in wb.worksheets:
        data = list(ws.iter_rows(values_only=True))
        if not data or not _header_index(data[0]):
            if norm_text(ws.title):
                skipped.append(ws.title)
            continue
        read.append(ws.title)
        for i, raw in enumerate(data[1:], start=2):
            cells = list(raw)[:5] + [None] * (5 - len(list(raw)[:5]))
            if all(c is None or str(c).strip() == "" for c in cells):
                blank_dropped += 1
                continue
            row = Row(
                sheet=norm_text(ws.title),
                excel_row=i,
                employee_no=_emp_to_text(cells[0]),
                name=_clean_name(cells[1]),
                management_unit=norm_text(cells[2]),
                raw_district=norm_text(cells[3]),
                raw_region=norm_text(cells[4]),
            )
            if not row.employee_no:
                row.problems.append("missing employee number")
            if not row.name:
                row.problems.append("missing name")
            d = mapping.resolve(row.raw_district)
            if d:
                row.district, row.zone = d.name, d.zone
            else:
                row.problems.append(f"unmapped district: {row.raw_district!r}")
            if row.raw_region and row.raw_region.lower() != REGION_CANON.lower():
                row.problems.append(f"unexpected region: {row.raw_region!r}")
            rows.append(row)

    wb.close()

    # duplicate employee numbers within the file
    seen: dict[str, Row] = {}
    for r in rows:
        if not r.employee_no:
            continue
        if r.employee_no in seen:
            r.problems.append("duplicate employee number")
            first = seen[r.employee_no]
            if "duplicate employee number" not in first.problems:
                first.problems.append("duplicate employee number")
        else:
            seen[r.employee_no] = r

    return ParseResult(path, file_hash, read, skipped, rows, blank_dropped)
