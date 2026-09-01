import type { ReactNode } from "react";

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl uppercase tracking-tight">{title}</h1>
      {sub && <p className="text-ink-2 mt-1">{sub}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card bg-surface border rounded p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="stat-3d p-4">
      <div className="font-display text-2xl font-extrabold tabular-nums leading-none">{value}</div>
      <div className="text-xs font-mono text-ink-3 mt-1.5">{label}</div>
    </div>
  );
}

const STATUS = {
  GROWING: "bg-grow-wash text-grow",
  STABLE: "bg-stable-wash text-stable",
  DECLINING: "bg-decline-wash text-decline",
  NEW: "bg-surface-2 text-ink-3",
} as const;

export function StatusPill({ status }: { status: keyof typeof STATUS }) {
  const glyph = { GROWING: "▲", DECLINING: "▼", STABLE: "–", NEW: "∗" }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded-full ${STATUS[status]}`}>
      <span aria-hidden>{glyph}</span>
      {status}
    </span>
  );
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="card overflow-x-auto border rounded p-0">
      <table className="w-full text-sm font-mono min-w-[520px]">
        <thead className="head-3d bg-primary text-on-primary">
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const Th = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <th className={`text-left font-medium text-[11px] uppercase tracking-wide px-3 py-2 ${className}`}>
    {children}
  </th>
);
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => (
  <td className={`px-3 py-2 border-t border-border ${className}`}>{children}</td>
);
