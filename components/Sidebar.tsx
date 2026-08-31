"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { Logo } from "@/components/Logo";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Logo size={34} />
        <div className="leading-tight">
          <div className="font-display text-sm uppercase tracking-tight">PRETAG AMIS</div>
          <div className="text-[10px] font-mono text-ink-3">Ashanti Region</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {NAV.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-ink-3">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.ready ? item.href : "#"}
                  aria-disabled={!item.ready}
                  className={[
                    "block rounded px-3 py-1.5 text-sm border-l-2",
                    active
                      ? "border-primary bg-surface-2 text-ink font-medium"
                      : "border-transparent text-ink-2 hover:bg-surface-2",
                    !item.ready && "opacity-40 pointer-events-none",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
