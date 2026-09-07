"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

/* Shared open/closed state for the mobile navigation drawer. The hamburger
   button lives in the header and the drawer lives in the sidebar, so the
   state has to sit above both. On large screens the sidebar is always
   visible and this state is simply ignored. */

type NavState = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const NavCtx = createContext<NavState | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // Close the drawer whenever the route changes (a nav link was tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open on mobile, and close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return <NavCtx.Provider value={{ open, toggle, close }}>{children}</NavCtx.Provider>;
}

export function useNav(): NavState {
  const ctx = useContext(NavCtx);
  if (!ctx) throw new Error("useNav must be used within <NavProvider>");
  return ctx;
}
