"use client";

import { setMovementReason } from "@/app/(app)/analytics/movement/actions";

const OPTIONS = [
  ["", "- add reason -"],
  ["retirement", "Retirement"],
  ["transfer", "Transfer"],
  ["union_switch", "Union switch"],
  ["payroll_correction", "Payroll correction"],
  ["termination", "Termination"],
  ["death", "Death"],
  ["duplicate_correction", "Duplicate correction"],
  ["unknown", "Unknown"],
  ["other", "Other"],
] as const;

export function ReasonSelect({
  employeeNo,
  periodId,
  kind,
  current,
}: {
  employeeNo: string;
  periodId: number;
  kind: string;
  current: string | null;
}) {
  return (
    <form action={setMovementReason} className="inline">
      <input type="hidden" name="employee_no" value={employeeNo} />
      <input type="hidden" name="period_id" value={periodId} />
      <input type="hidden" name="kind" value={kind} />
      <select
        name="reason"
        defaultValue={current ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`text-xs font-mono rounded border px-1.5 py-0.5 outline-none ${
          current ? "border-grow text-grow bg-grow-wash" : "border-border text-ink-3 bg-ground"
        }`}
      >
        {OPTIONS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </form>
  );
}
