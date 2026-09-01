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
      className="btn-ghost-3d font-mono text-sm font-bold uppercase tracking-wide px-3.5 py-2 text-ink-2 hover:text-primary"
    >
      Sign out
    </button>
  );
}
