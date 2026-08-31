"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children = "Save",
  variant = "primary",
  form,
}: {
  children?: React.ReactNode;
  variant?: "primary" | "ghost";
  form?: string;
}) {
  const { pending } = useFormStatus();
  const base = "font-mono text-xs uppercase tracking-wide rounded px-3 py-1.5 disabled:opacity-50";
  const style =
    variant === "primary"
      ? "bg-primary text-on-primary hover:bg-primary-hover"
      : "border border-border-strong text-ink-2 hover:border-primary hover:text-primary";
  return (
    <button type="submit" form={form} disabled={pending} className={`${base} ${style}`}>
      {pending ? "Working..." : children}
    </button>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  options: { value: string | number; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FormMessage({ message }: { message?: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p
      className={`text-xs font-mono px-2.5 py-1.5 rounded ${
        message.ok ? "bg-grow-wash text-grow" : "bg-decline-wash text-decline"
      }`}
    >
      {message.text}
    </p>
  );
}
