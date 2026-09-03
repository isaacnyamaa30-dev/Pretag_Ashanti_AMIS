import Image from "next/image";
import { redirect } from "next/navigation";
import { getAccessState } from "@/lib/access";

export const metadata = { title: "Access suspended - PRETAG AMIS" };
export const dynamic = "force-dynamic";

export default async function SuspendedPage({
  searchParams,
}: {
  searchParams: { a?: string };
}) {
  const access = await getAccessState();
  const individual = searchParams.a === "1" && !access.suspended;

  // nothing is actually suspended and this isn't an individual hold -> no reason to be here
  if (!access.suspended && !individual) redirect("/login");

  return (
    <main className="login-bg relative min-h-screen overflow-hidden grid place-items-center px-4 py-12">
      <div className="login-glow" aria-hidden />
      <div className="login-grain" aria-hidden />

      <div className="relative w-full max-w-md text-center">
        <Image
          src="/assets/pretag-emblem.jpg"
          alt="PRETAG Ashanti"
          width={80}
          height={80}
          priority
          className="mx-auto rounded-full ring-2 ring-white/30 shadow-xl mb-5"
        />
        <div className="bg-surface border border-border-strong rounded-lg shadow-2xl p-7 text-left">
          <h1 className="font-display text-xl font-extrabold uppercase tracking-tight text-ink mb-3">
            {individual ? "Your access is on hold" : "Access temporarily suspended"}
          </h1>
          <p className="text-sm font-medium text-ink-2 leading-relaxed">
            {individual
              ? "Your sign-in has been placed on hold by the system developer. Please get in touch to have it restored."
              : access.message}
          </p>
          <div className="mt-5 pt-4 border-t border-border text-sm font-mono font-bold text-ink">
            <p>Isaac Nyamaa Boadi &mdash; system developer</p>
            <p className="mt-1">
              <a href="tel:+233243744689" className="text-ink underline">+233&nbsp;24&nbsp;374&nbsp;4689</a>
            </p>
            <p>
              <a href="mailto:isaacnyamaa30@gmail.com" className="text-ink underline break-all">
                isaacnyamaa30@gmail.com
              </a>
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] font-mono font-bold text-white/80">
          &copy; {new Date().getFullYear()} Isaac Nyamaa Boadi &middot; All Rights Reserved
        </p>
      </div>
    </main>
  );
}
