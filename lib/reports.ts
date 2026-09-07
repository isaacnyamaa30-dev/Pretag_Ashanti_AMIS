/**
 * Executive (REC / NEC) report data.
 *
 * The monthly Regional Report compares one month with the one before it.
 * PRETAG governance, though, reports on a quarter, a half-year or a full year
 * at a time. This module resolves a reporting range to two imported endpoints
 * (opening and closing) and assembles everything a formal report needs, so the
 * on-screen page and the Word export stay in step.
 */
import {
  type Period,
  comparePeriods,
  compareDistricts,
  membershipSeries,
  type CompareRow,
  type DistrictCompareRow,
} from "@/lib/analytics";
import { executiveSummary, trajectoryNote } from "@/lib/summary";

export type RangeStep = { from: string; to: string; net: number; pct: number | null };

function asc(periods: Period[]): Period[] {
  return [...periods].sort((a, b) => a.year - b.year || a.month - b.month);
}

/** Turn a preset (or an explicit from/to) into two imported-period ids. */
export function resolveRange(
  periods: Period[],
  opts: { preset?: string; from?: number; to?: number },
): { fromId: number; toId: number } {
  const months = asc(periods);
  const earliest = months[0];
  const latest = months[months.length - 1];

  const valid = (id?: number) => id && months.some((p) => p.id === id);
  if ((!opts.preset || opts.preset === "custom") && valid(opts.from) && valid(opts.to)) {
    return { fromId: opts.from!, toId: opts.to! };
  }

  switch (opts.preset) {
    case "all-time":
      return { fromId: earliest.id, toId: latest.id };
    case "year-to-date": {
      const firstOfYear = months.find((p) => p.year === latest.year) ?? earliest;
      return { fromId: firstOfYear.id, toId: latest.id };
    }
    case "half-year":
      return { fromId: months[Math.max(0, months.length - 1 - 6)].id, toId: latest.id };
    case "latest-quarter":
    default:
      return { fromId: months[Math.max(0, months.length - 1 - 3)].id, toId: latest.id };
  }
}

/** A human name for the span, e.g. "First Quarter 2026" or "2026 Annual". */
export function describeRange(from: Period, to: Period): { name: string; span: string } {
  const span = `${from.label} to ${to.label}`;
  if (from.year === to.year) {
    const q = (start: number, end: number, name: string) =>
      from.month === start && to.month === end ? name : null;
    const named =
      q(1, 3, "First Quarter") ||
      q(4, 6, "Second Quarter") ||
      q(7, 9, "Third Quarter") ||
      q(10, 12, "Fourth Quarter") ||
      q(1, 6, "First Half") ||
      q(7, 12, "Second Half") ||
      (from.month === 1 && to.month === 12 ? "Annual" : null);
    if (named === "Annual") return { name: `${from.year} Annual Report`, span };
    if (named) return { name: `${named} ${from.year}`, span };
  }
  return { name: span, span };
}

export type ExecutiveReport = {
  from: Period;
  to: Period;
  name: string;
  span: string;
  monthsCovered: number;
  region: CompareRow | undefined;
  zones: CompareRow[];
  steps: RangeStep[];
  best: RangeStep | null;
  worst: RangeStep | null;
  risingDistricts: DistrictCompareRow[];
  fallingDistricts: DistrictCompareRow[];
  summary: string;
  trajectory: string;
};

export async function buildExecutiveReport(
  periods: Period[],
  fromId: number,
  toId: number,
): Promise<ExecutiveReport> {
  const months = asc(periods);
  let from = months.find((p) => p.id === fromId) ?? months[0];
  let to = months.find((p) => p.id === toId) ?? months[months.length - 1];
  // keep opening before closing however the caller passed them
  if (from.year > to.year || (from.year === to.year && from.month > to.month)) {
    [from, to] = [to, from];
  }

  const [rows, districtRows, series] = await Promise.all([
    comparePeriods(from.id, to.id),
    compareDistricts(from.id, to.id),
    membershipSeries(),
  ]);

  // month-by-month path across the months that fall inside the range
  const fromIdx = series.findIndex((s) => s.periodId === from.id);
  const toIdx = series.findIndex((s) => s.periodId === to.id);
  const sub = fromIdx >= 0 && toIdx >= 0 ? series.slice(fromIdx, toIdx + 1) : series;
  const steps: RangeStep[] = [];
  for (let i = 1; i < sub.length; i++) {
    const prev = sub[i - 1].members;
    const cur = sub[i].members;
    steps.push({
      from: sub[i - 1].label,
      to: sub[i].label,
      net: cur - prev,
      pct: prev === 0 ? null : Math.round(((cur - prev) / prev) * 10000) / 100,
    });
  }

  const region = rows.find((r) => r.level === "region");
  const zones = rows.filter((r) => r.level === "zone").sort((a, b) => b.net - a.net);

  return {
    from,
    to,
    ...describeRange(from, to),
    monthsCovered: Math.max(sub.length, 2),
    region,
    zones,
    steps,
    best: steps.length ? steps.reduce((a, b) => (b.net > a.net ? b : a)) : null,
    worst: steps.length ? steps.reduce((a, b) => (b.net < a.net ? b : a)) : null,
    risingDistricts: districtRows.filter((d) => d.net > 0).sort((a, b) => b.net - a.net).slice(0, 8),
    fallingDistricts: districtRows.filter((d) => d.net < 0).sort((a, b) => a.net - b.net).slice(0, 8),
    summary: executiveSummary(rows, from.label, to.label),
    trajectory: trajectoryNote(steps),
  };
}
