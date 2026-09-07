"use client";

import { useId, useState } from "react";

/**
 * Password input with a show / hide toggle so a user can check what they typed
 * and correct a mistyped password before submitting. Used on the sign-in form
 * and the set-new-password screen.
 */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  const id = useId();

  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-xs font-mono font-bold uppercase tracking-wide text-ink-2">{label}</span>
      <span className="relative flex items-center">
        <input
          id={id}
          type={show ? "text" : "password"}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-border-strong rounded bg-ground pl-3 pr-11 py-2 text-ink font-semibold outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "Hide password" : "Show password"}
          className="absolute right-1 inline-flex h-9 w-9 items-center justify-center rounded text-ink-2 hover:text-primary"
        >
          {show ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
              <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
              <path d="m2 2 20 20" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
}
