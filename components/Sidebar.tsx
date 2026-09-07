"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, type NavGroup } from "@/lib/nav";
import { Logo } from "@/components/Logo";
import { useNav } from "@/components/nav/NavContext";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ group, pathname }: { group: NavGroup; pathname: string }) {
  // The drawer closes itself when the route changes (see NavContext), so we
  // deliberately do NOT close it in an onClick here - unmounting the link in
  // the same tap that triggers navigation can swallow the tap on mobile.
  return (
    <div className="flex flex-col gap-1">
      {group.items.map((item) => (
        <Link
          key={item.href}
          href={item.ready ? item.href : "#"}
          aria-disabled={!item.ready}
          data-active={isActive(pathname, item.href) ? "true" : undefined}
          className={[
            "block rounded-md pl-4 pr-3 py-2.5 text-[13px] text-ink-2",
            !item.ready && "opacity-40 pointer-events-none",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/** Desktop: every group is shown open, headers are plain labels. */
function NavListStatic({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  return (
    <nav id="primary-nav" className="nav3d flex-1 overflow-y-auto py-4 px-2.5" aria-label="Primary">
      {groups.map((group) => (
        <div key={group.label} className="mb-5">
          <div className="px-2 pb-2 mb-1.5 font-display text-[15px] font-extrabold uppercase tracking-tight text-ink border-b-2 border-border-strong">
            {group.label}
          </div>
          <NavLinks group={group} pathname={pathname} />
        </div>
      ))}
    </nav>
  );
}

/** Mobile drawer: each group header is a button that expands / collapses its
 *  links, so the list is short and tappable. The group holding the current
 *  page starts open. */
function NavListCollapsible({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const activeGroup = groups.find((g) => g.items.some((i) => isActive(pathname, i.href)))?.label;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    activeGroup ? { [activeGroup]: true } : {},
  );

  return (
    <nav id="primary-nav" className="nav3d flex-1 overflow-y-auto py-3 px-2.5" aria-label="Primary">
      {groups.map((group) => {
        const expanded = !!openGroups[group.label];
        return (
          <div key={group.label} className="mb-1.5 border-b border-border">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpenGroups((s) => ({ ...s, [group.label]: !s[group.label] }))}
              className="w-full flex items-center justify-between gap-2 px-2 py-3 font-display text-[15px] font-extrabold uppercase tracking-tight text-ink"
            >
              <span>{group.label}</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {expanded && (
              <div className="pb-2">
                <NavLinks group={group} pathname={pathname} />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-border-strong bg-surface-2/60">
      <Logo size={36} />
      <div className="leading-tight">
        <div className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">PRETAG AMIS</div>
        <div className="text-xs font-mono font-bold uppercase tracking-wide text-ink mt-0.5">Ashanti Region</div>
      </div>
    </div>
  );
}

function Contact() {
  return (
    <div className="border-t border-border-strong px-4 py-3 text-xs font-mono font-bold text-ink leading-relaxed bg-surface-2/50">
      Developed by Saris IT Solution
      <br />&copy; {new Date().getFullYear()} &middot; All Rights Reserved
      <div className="mt-2 pt-2 border-t border-border">
        <span className="uppercase tracking-wide text-ink-2">Enquiries &amp; services</span>
        <br />
        <a href="tel:+233241176269" className="text-ink underline text-[13px]">+233&nbsp;24&nbsp;117&nbsp;6269</a>
        <br />
        <a href="mailto:sarisitsolution@gmail.com" className="text-ink underline text-[13px] break-all">sarisitsolution@gmail.com</a>
      </div>
    </div>
  );
}

export function Sidebar({ isDeveloper = false }: { isDeveloper?: boolean }) {
  const { open, close } = useNav();
  const groups: NavGroup[] = isDeveloper
    ? [
        ...NAV,
        {
          label: "Owner",
          items: [{ label: "Developer Console", href: "/developer", ready: true }],
        },
      ]
    : NAV;

  return (
    <>
      {/* Desktop: always-visible column */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border-strong bg-surface flex-col">
        <Brand />
        <NavListStatic groups={groups} />
        <Contact />
      </aside>

      {/* Mobile: slide-in drawer. Only mounted while open so an off-canvas
          panel can never widen the page or make the phone zoom out. */}
      {open && (
        <div className="lg:hidden">
          <div
            className="drawer-overlay fixed inset-0 z-40 bg-black/50"
            onClick={close}
            aria-hidden
          />
          <aside className="drawer-panel fixed inset-y-0 left-0 z-50 flex w-[80vw] max-w-xs flex-col border-r border-border-strong bg-surface shadow-2xl">
            <Brand />
            <NavListCollapsible groups={groups} />
            <Contact />
          </aside>
        </div>
      )}
    </>
  );
}
