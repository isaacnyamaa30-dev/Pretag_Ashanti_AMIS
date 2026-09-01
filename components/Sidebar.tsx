"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { Logo } from "@/components/Logo";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-border-strong bg-surface flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-strong bg-surface-2/60">
        <Logo size={34} />
        <div className="leading-tight">
          <div className="font-display text-sm uppercase tracking-tight">PRETAG AMIS</div>
          <div className="text-[10px] font-mono text-ink-3">Ashanti Region</div>
        </div>
      </div>

      <nav className="nav3d flex-1 overflow-y-auto py-4 px-2.5" aria-label="Primary">
        {NAV.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-ink-3">
              {group.label}
            </div>
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.ready ? item.href : "#"}
                    aria-disabled={!item.ready}
                    data-active={active ? "true" : undefined}
                    className={[
                      "block rounded-md px-3 py-1.5 text-sm text-ink-2",
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
          </div>
        ))}
      </nav>
      <div className="border-t border-border-strong px-4 py-3 text-[10px] font-mono text-ink-3 leading-relaxed bg-surface-2/50">
        Developed by <span className="text-ink-2">Isaac Nyamaa Boadi</span>
        <br />&copy; {new Date().getFullYear()} &middot; all rights reserved
      </div>
    </aside>
  );
}
