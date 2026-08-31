import Link from "next/link";
import { requireUser } from "@/lib/auth";

const TABS = [
  { href: "/analytics/regional", label: "Regional" },
  { href: "/analytics/zones", label: "Zones" },
  { href: "/analytics/districts", label: "Districts" },
  { href: "/analytics/movement", label: "Movement" },
  { href: "/compare/monthly", label: "Compare" },
];

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
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
