"use client";

import { useFormState } from "react-dom";
import { SubmitButton, FormMessage } from "@/components/forms";
import { uploadR20 } from "@/app/(app)/r20/upload/actions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function UploadForm() {
  const [state, formAction] = useFormState(uploadR20, null);
  const now = new Date();

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Regional R20 file (.xlsx)</span>
        <input
          name="file"
          type="file"
          accept=".xlsx"
          required
          className="text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:text-on-primary file:px-3 file:py-1.5 file:font-mono file:text-xs file:uppercase file:tracking-wide"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-col gap-1.5 grow">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Month</span>
          <select
            name="month"
            defaultValue={now.getMonth() + 1}
            className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 w-28">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Year</span>
          <input
            name="year"
            type="number"
            defaultValue={now.getFullYear()}
            className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm font-mono outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>Upload &amp; validate</SubmitButton>
        <FormMessage message={state} />
      </div>
      <p className="text-[11px] font-mono text-ink-3">
        The file is stored, checked, and staged. Nothing enters the membership history until you approve it.
      </p>
    </form>
  );
}
