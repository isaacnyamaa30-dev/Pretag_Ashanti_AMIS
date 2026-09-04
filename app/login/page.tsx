import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { InstallApp } from "@/components/InstallApp";

export const metadata = { title: "Sign in - PRETAG AMIS" };

export default function LoginPage() {
  return (
    <main className="login-bg relative min-h-screen overflow-hidden grid place-items-center px-4 py-12">
      {/* warm layered backdrop */}
      <div className="login-glow" aria-hidden />
      <div className="login-pattern" aria-hidden />
      <div className="login-grain" aria-hidden />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-7 text-center">
          <Image
            src="/assets/pretag-emblem.jpg"
            alt="PRETAG Ashanti"
            width={80}
            height={80}
            priority
            className="rounded-full ring-2 ring-white/40 shadow-xl"
          />
          <div style={{ textShadow: "0 1px 12px rgba(80,10,0,.45)" }}>
            <h1 className="font-display text-white text-2xl font-extrabold uppercase tracking-wide leading-tight">
              PRETAG Ashanti
            </h1>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#FFE7BE] mt-1">
              Membership Intelligence
            </p>
          </div>
        </div>

        <div className="bg-surface border border-border-strong rounded-lg shadow-2xl p-7">
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight mb-1">Sign in</h2>
          <p className="text-sm font-bold text-ink-2 mb-6 font-mono">Ashanti Regional R20</p>
          <Suspense fallback={<div className="h-52" />}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="mt-4 flex flex-col items-center gap-2">
          <InstallApp label="Install app on this device" />
          <Link
            href="/install"
            className="text-[11px] font-mono font-bold uppercase tracking-wide text-[#FFEDCB] underline"
          >
            How to install on phone &amp; laptop
          </Link>
        </div>

        <p
          className="text-center text-sm font-mono font-bold uppercase tracking-[0.2em] text-[#FFEDCB] mt-6"
          style={{ textShadow: "0 1px 10px rgba(80,10,0,.5)" }}
        >
          Quality Education, Our Concern
        </p>
        <p className="text-center text-xs font-mono font-bold text-white/80 mt-4">
          &copy; {new Date().getFullYear()} Isaac Nyamaa Boadi &middot; All Rights Reserved
        </p>
        <div className="mt-3 rounded-lg bg-black/25 px-4 py-3 text-center">
          <p className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-[#FFE7BE]">
            Enquiries &amp; services
          </p>
          <p className="mt-1.5 text-base font-mono font-bold leading-relaxed">
            <a href="tel:+233243744689" className="text-white underline decoration-white/40">
              +233&nbsp;24&nbsp;374&nbsp;4689
            </a>
            <br />
            <a href="mailto:sarisitsolution@gmail.com" className="text-white underline decoration-white/40 break-all">
              sarisitsolution@gmail.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
