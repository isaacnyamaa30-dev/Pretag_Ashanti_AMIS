"use client";

import { useFormState } from "react-dom";
import { useState } from "react";
import { Card } from "@/components/ui";
import { SubmitButton, FormMessage } from "@/components/forms";
import {
  toggleSuspension,
  setUserPassword,
  setUserEmail,
  setUserActive,
} from "@/app/(app)/developer/actions";

type Row = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  role: string;
  isOwner: boolean;
  lastSignIn: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "never";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SuspensionCard({
  suspended,
  message,
  updatedAt,
}: {
  suspended: boolean;
  message: string;
  updatedAt: string | null;
}) {
  const [state, action] = useFormState(toggleSuspension, null);
  const [confirm, setConfirm] = useState("");
  const [text, setText] = useState(message);
  const want = suspended ? "RESUME" : "SUSPEND";

  return (
    <Card
      className={`mb-8 ${suspended ? "border-decline/50 bg-decline-wash/40" : "border-border-strong"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h3 className="font-display text-sm uppercase tracking-tight">Master access switch</h3>
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded-full ${
            suspended ? "bg-decline-wash text-decline" : "bg-grow-wash text-grow"
          }`}
        >
          {suspended ? "ALL ACCESS SUSPENDED" : "access open"}
        </span>
      </div>
      <p className="text-sm text-ink-2 mb-4 max-w-prose">
        {suspended
          ? "Everyone except your owner account is locked out and sees the message below. Resume to let people back in."
          : "Suspend to immediately lock out every account except your own. Existing sessions are bounced on their next action. Use this if talks stall."}
        {updatedAt && (
          <span className="block text-[11px] text-ink-3 font-mono mt-1">
            last changed {fmtDate(updatedAt)}
          </span>
        )}
      </p>

      <form action={action} className="flex flex-col gap-3 max-w-lg">
        <input type="hidden" name="suspend" value={String(!suspended)} />
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">
            Message shown to locked-out users
          </span>
          <textarea
            name="message"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">
            Type <span className={suspended ? "text-grow" : "text-decline"}>{want}</span> to confirm
          </span>
          <input
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm font-mono w-40 outline-none focus:border-primary"
          />
        </label>
        <FormMessage message={state} />
        <div className={confirm === want ? "" : "opacity-40 pointer-events-none"}>
          <SubmitButton variant={suspended ? "primary" : "ghost"}>
            {suspended ? "Resume access for everyone" : "Suspend all access now"}
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm({ user }: { user: Row }) {
  const [state, action] = useFormState(setUserPassword, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="user_id" value={user.id} />
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-mono uppercase tracking-wide text-ink-3">New password</span>
        <input
          name="password"
          type="text"
          autoComplete="off"
          placeholder="at least 8 characters"
          className="border border-border-strong rounded bg-ground px-2 py-1 text-sm font-mono w-56 outline-none focus:border-primary"
        />
      </label>
      <SubmitButton variant="ghost">Set password</SubmitButton>
      <FormMessage message={state} />
    </form>
  );
}

function EmailForm({ user }: { user: Row }) {
  const [state, action] = useFormState(setUserEmail, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="user_id" value={user.id} />
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-mono uppercase tracking-wide text-ink-3">Move to email</span>
        <input
          name="email"
          type="email"
          defaultValue={user.email}
          className="border border-border-strong rounded bg-ground px-2 py-1 text-sm font-mono w-64 outline-none focus:border-primary"
        />
      </label>
      <SubmitButton variant="ghost">Change email</SubmitButton>
      <FormMessage message={state} />
    </form>
  );
}

function ActiveForm({ user }: { user: Row }) {
  const [state, action] = useFormState(setUserActive, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="user_id" value={user.id} />
      <input type="hidden" name="active" value={String(!user.isActive)} />
      <SubmitButton variant="ghost">{user.isActive ? "Disable account" : "Enable account"}</SubmitButton>
      <FormMessage message={state} />
    </form>
  );
}

export function DeveloperConsole({
  users,
  suspended,
  message,
  updatedAt,
}: {
  users: Row[];
  suspended: boolean;
  message: string;
  updatedAt: string | null;
}) {
  return (
    <>
      <SuspensionCard suspended={suspended} message={message} updatedAt={updatedAt} />

      <h3 className="font-display text-sm uppercase tracking-tight mb-3">Accounts</h3>
      <div className="flex flex-col gap-3">
        {users.map((u) => (
          <div
            key={u.id}
            className={`bg-surface border rounded px-4 py-3 ${
              u.isOwner ? "border-primary/60" : "border-border"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <div>
                <span className="font-medium">{u.fullName}</span>{" "}
                <span className="font-mono text-xs text-ink-3">{u.email}</span>
                {u.isOwner && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-wash text-primary">
                    owner
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
                <span>{u.role}</span>
                <span
                  className={`px-2 py-0.5 rounded-full ${
                    u.isActive ? "bg-grow-wash text-grow" : "bg-surface-2 text-ink-3"
                  }`}
                >
                  {u.isActive ? "active" : "disabled"}
                </span>
                <span>last in: {fmtDate(u.lastSignIn)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <PasswordForm user={u} />
              <EmailForm user={u} />
              {!u.isOwner && <ActiveForm user={u} />}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] font-mono text-ink-3 mt-6 max-w-prose">
        A disabled account, and every account when the master switch is on, is signed out and sent to
        the suspended-access page. Your owner account is never affected. Setting a new password ends
        that person&apos;s other sessions within the hour.
      </p>
    </>
  );
}
