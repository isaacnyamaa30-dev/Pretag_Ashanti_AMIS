import Link from "next/link";
import { requireStaff } from "@/lib/auth";

const TABS = [
  { href: "/r20/upload", label: "Upload R20" },
  { href: "/r20/queue", label: "Validation Queue" },
  { href: "/r20/history", label: "Import History" },
  { href: "/r20/archive", label: "Archive" },
];

export default async function R20Layout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div>
      <nav className="flex flex-wrap gap-1 border-b border-border mb-6">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-3 py-2 text-sm font-mono text-ink-2 hover:text-ink border-b-2 border-transparent hover:border-border-strong -mb-px"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
