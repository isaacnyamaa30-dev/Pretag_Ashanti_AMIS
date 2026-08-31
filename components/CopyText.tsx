"use client";

import { useState } from "react";

export function CopyText({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="font-mono text-[11px] uppercase tracking-wide border border-border-strong rounded px-2.5 py-1 text-ink-2 hover:border-primary hover:text-primary"
    >
      {done ? "Copied" : label}
    </button>
  );
}
