"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton, FormMessage } from "@/components/forms";
import { resetMembershipData } from "@/app/(app)/admin/settings/reset-action";

export function ResetMembershipData() {
  const [state, formAction] = useFormState(resetMembershipData, null);
  const [confirm, setConfirm] = useState("");

  return (
    <div className="border border-decline/40 bg-decline-wash/40 rounded p-5">
      <h3 className="font-display text-sm uppercase tracking-tight text-decline mb-1">
        Reset membership data
      </h3>
      <p className="text-sm text-ink-2 mb-4 max-w-prose">
        Permanently deletes every imported R20, all monthly snapshots, all member records and
        every stored file. Keeps the zones, districts, aliases, roles, users and settings.
        Use this once, before going live, to clear trial data. <strong>This cannot be undone.</strong>
      </p>
      <form action={formAction} className="flex flex-col gap-3 max-w-sm">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="keep_aliases" defaultChecked />
          Keep district aliases resolved during testing
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">
            Type <span className="text-decline">RESET</span> to confirm
          </span>
          <input
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="border border-decline/50 rounded bg-ground px-2.5 py-1.5 text-sm font-mono outline-none focus:border-decline"
          />
        </label>
        <div className="flex items-center gap-3">
          <span className={confirm === "RESET" ? "" : "opacity-40 pointer-events-none"}>
            <SubmitButton>Reset everything</SubmitButton>
          </span>
          <FormMessage message={state} />
        </div>
      </form>
    </div>
  );
}
