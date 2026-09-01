"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Tabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="tabs-3d no-print mb-6 font-mono text-sm" aria-label="Section">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link key={t.href} href={t.href} data-active={active ? "true" : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
