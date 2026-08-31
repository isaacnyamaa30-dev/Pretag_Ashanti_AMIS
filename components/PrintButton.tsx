"use client";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print font-mono text-xs uppercase tracking-wide bg-primary text-on-primary rounded px-3 py-2"
    >
      {label}
    </button>
  );
}
