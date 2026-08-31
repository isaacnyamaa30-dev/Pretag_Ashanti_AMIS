"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5 text-ink-2 hover:border-primary hover:text-primary"
    >
      Sign out
    </button>
  );
}
