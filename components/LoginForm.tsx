"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "reset";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(
        "That email and password did not match. Try again, or reset your password below.",
      );
      setBusy(false);
      return;
    }
    router.replace(params.get("next") || "/dashboard");
    router.refresh();
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email address first.");
      setBusy(false);
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setNotice(
      `If an account exists for ${email}, a password-reset link is on its way. Check your inbox.`,
    );
  }

  if (mode === "reset") {
    return (
      <form onSubmit={sendReset} className="flex flex-col gap-4">
        <p className="text-sm text-ink-2">
          Enter your email and we&apos;ll send a link to set a new password.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono font-bold uppercase tracking-wide text-ink-2">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-border-strong rounded bg-ground px-3 py-2 text-ink font-semibold outline-none focus:border-primary"
          />
        </label>

        {error && (
          <p className="text-sm text-decline bg-decline-wash border border-decline/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-grow bg-grow-wash border border-grow/30 rounded px-3 py-2">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 bg-primary hover:bg-primary-hover text-on-primary btn-3d font-display uppercase tracking-wide text-[15px] font-extrabold py-3 disabled:opacity-60"
        >
          {busy ? "Sending..." : "Send reset link"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setError(null);
            setNotice(null);
          }}
          className="text-[13px] font-mono font-bold text-ink-2 hover:text-primary underline self-center"
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={signIn} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-mono font-bold uppercase tracking-wide text-ink-2">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-border-strong rounded bg-ground px-3 py-2 text-ink font-semibold outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-mono font-bold uppercase tracking-wide text-ink-2">Password</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-border-strong rounded bg-ground px-3 py-2 text-ink font-semibold outline-none focus:border-primary"
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
        className="mt-1 bg-primary hover:bg-primary-hover text-on-primary btn-3d font-display uppercase tracking-wide text-[15px] font-extrabold py-3 disabled:opacity-60"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode("reset");
          setError(null);
        }}
        className="text-[13px] font-mono font-bold text-ink-2 hover:text-primary underline self-center"
      >
        Forgot your password?
      </button>
    </form>
  );
}
