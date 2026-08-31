"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // the browser client exchanges the recovery code / hash on load
    const t = setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setReady(session ? "ok" : "invalid");
    }, 400);
    return () => clearTimeout(t);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => {
      router.replace("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="login-bg relative min-h-screen overflow-hidden grid place-items-center px-4 py-12">
      <div className="login-glow" aria-hidden />
      <div className="login-grain" aria-hidden />
      <Image src="/assets/pretag-emblem.jpg" alt="" aria-hidden width={900} height={900} priority className="login-seal" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-7 text-center">
          <Image src="/assets/pretag-emblem.jpg" alt="PRETAG Ashanti" width={72} height={72} priority className="rounded-full ring-2 ring-white/20 shadow-lg" />
          <h1 className="font-display text-white text-lg uppercase tracking-wide">Set a new password</h1>
        </div>

        <div className="bg-surface border border-border rounded-lg shadow-2xl p-7">
          {ready === "checking" && <p className="text-sm text-ink-3 font-mono">Checking your link...</p>}

          {ready === "invalid" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-decline bg-decline-wash border border-decline/30 rounded px-3 py-2">
                This reset link is invalid or has expired.
              </p>
              <a href="/login" className="text-xs font-mono underline text-ink-3 hover:text-primary self-center">
                Back to sign in
              </a>
            </div>
          )}

          {ready === "ok" && !done && (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-mono uppercase tracking-wide text-ink-2">New password</span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-border-strong rounded bg-ground px-3 py-2 outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-mono uppercase tracking-wide text-ink-2">Confirm new password</span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="border border-border-strong rounded bg-ground px-3 py-2 outline-none focus:border-primary"
                />
              </label>
              {error && (
                <p className="text-sm text-decline bg-decline-wash border border-decline/30 rounded px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="mt-1 bg-primary hover:bg-primary-hover text-on-primary font-display uppercase tracking-wide text-sm rounded py-2.5 disabled:opacity-60"
              >
                {busy ? "Saving..." : "Save new password"}
              </button>
            </form>
          )}

          {done && (
            <p className="text-sm text-grow bg-grow-wash border border-grow/30 rounded px-3 py-2">
              Password updated. Taking you to the dashboard...
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
