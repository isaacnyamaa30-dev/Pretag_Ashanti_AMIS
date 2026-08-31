"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { SubmitButton, FormMessage } from "@/components/forms";
import { createUser } from "@/app/(app)/admin/users/actions";

type Option = { id: number; label: string };

export function UserCreateForm({
  roles,
  zones,
  districts,
}: {
  roles: Option[];
  zones: Option[];
  districts: Option[];
}) {
  const [state, formAction] = useFormState(createUser, null);
  const [scope, setScope] = useState("region");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Full name</span>
          <input name="full_name" required className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Email</span>
          <input name="email" type="email" required className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Temporary password</span>
          <input name="password" type="text" required minLength={8} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm font-mono outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Role</span>
          <select name="role_id" required className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary">
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Data scope</span>
          <select name="scope" value={scope} onChange={(e) => setScope(e.target.value)} className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary">
            <option value="region">Whole region</option>
            <option value="zone">One zone</option>
            <option value="district">One district</option>
          </select>
        </label>
        {scope === "zone" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Zone</span>
            <select name="zone_id" className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary">
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.label}</option>
              ))}
            </select>
          </label>
        )}
        {scope === "district" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">District</span>
            <select name="district_id" className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary">
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton>Create user</SubmitButton>
        <FormMessage message={state} />
      </div>
      <p className="text-[11px] font-mono text-ink-3">
        The person signs in with this email + temporary password. They should change it afterwards.
      </p>
    </form>
  );
}
