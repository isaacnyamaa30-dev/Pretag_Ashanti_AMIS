import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Sign in - PRETAG AMIS" };

export default function LoginPage() {
  return (
    <main className="login-bg relative min-h-screen overflow-hidden grid place-items-center px-4 py-12">
      {/* deep layered backdrop */}
      <div className="login-glow" aria-hidden />
      <div className="login-grain" aria-hidden />
      <Image
        src="/assets/pretag-emblem.jpg"
        alt=""
        aria-hidden
        width={900}
        height={900}
        priority
        className="login-seal"
      />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-7 text-center">
          <Image
            src="/assets/pretag-emblem.jpg"
            alt="PRETAG Ashanti"
            width={72}
            height={72}
            priority
            className="rounded-full ring-2 ring-white/20 shadow-lg"
          />
          <div>
            <h1 className="font-display text-white text-lg uppercase tracking-wide leading-tight">
              PRETAG Ashanti
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/55 mt-1">
              Membership Intelligence
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg shadow-2xl p-7">
          <h2 className="font-display text-xl uppercase tracking-tight mb-1">Sign in</h2>
          <p className="text-sm text-ink-3 mb-6 font-mono">Ashanti Regional R20</p>
          <Suspense fallback={<div className="h-52" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-[11px] font-mono uppercase tracking-[0.18em] text-white/40 mt-6">
          Quality Education, Our Concern
        </p>
      </div>
    </main>
  );
}
