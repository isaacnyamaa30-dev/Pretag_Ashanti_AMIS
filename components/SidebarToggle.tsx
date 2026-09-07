"use client";

import { useNav } from "@/components/nav/NavContext";

/* Hamburger / close button shown in the header on screens below `lg`.
   Hidden on large screens where the sidebar is always visible. */
export function SidebarToggle() {
  const { open, toggle } = useNav();
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-ghost-3d lg:hidden -ml-1 mr-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-ink-2 hover:text-primary"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls="primary-nav"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        {open ? (
          <>
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </>
        ) : (
          <>
            <path d="M3 6h18" />
            <path d="M3 12h18" />
            <path d="M3 18h18" />
          </>
        )}
      </svg>
    </button>
  );
}
