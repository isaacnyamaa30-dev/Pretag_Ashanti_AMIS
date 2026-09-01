"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";
import { Logo } from "@/components/Logo";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 shrink-0 border-r border-border-strong bg-surface flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border-strong bg-surface-2/60">
        <Logo size={36} />
        <div className="leading-tight">
          <div className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">PRETAG AMIS</div>
          <div className="text-xs font-mono font-bold uppercase tracking-wide text-ink mt-0.5">Ashanti Region</div>
        </div>
      </div>

      <nav className="nav3d flex-1 overflow-y-auto py-4 px-2.5" aria-label="Primary">
        {NAV.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="px-2 pb-2 mb-1.5 font-display text-[15px] font-extrabold uppercase tracking-tight text-ink border-b-2 border-border-strong">
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
                      "block rounded-md pl-4 pr-3 py-1.5 text-[13px] text-ink-2",
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
      <div className="border-t border-border-strong px-4 py-3 text-[11px] font-mono font-bold text-ink leading-relaxed bg-surface-2/50">
        Developed by Isaac Nyamaa Boadi
        <br />&copy; {new Date().getFullYear()} &middot; all rights reserved
        <br />
        <span className="text-ink-2">Enquiries &amp; services:</span>
        <br />
        <a href="tel:+233243744689" className="underline">+233 24 374 4689</a>
        <br />
        <a href="mailto:isaacnyamaa30@gmail.com" className="underline break-all">isaacnyamaa30@gmail.com</a>
      </div>
    </aside>
  );
}
