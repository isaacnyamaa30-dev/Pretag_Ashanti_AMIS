import Link from "next/link";
import Image from "next/image";
import { InstallApp, InstallSteps } from "@/components/InstallApp";

export const metadata = { title: "Install the app - PRETAG AMIS" };

function StepCard({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card bg-surface border border-border-strong rounded-lg p-6">
      <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
        {title}
      </h2>
      <p className="text-xs font-mono font-bold uppercase tracking-wide text-ink-3 mt-0.5 mb-4">
        {note}
      </p>
      {children}
    </div>
  );
}

export default function InstallPage() {
  return (
    <main className="min-h-screen bg-ground text-ink px-4 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/assets/pretag-emblem.jpg"
            alt="PRETAG Ashanti"
            width={56}
            height={56}
            className="rounded-full ring-2 ring-border-strong"
          />
          <div className="leading-tight">
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
              Install PRETAG AMIS
            </h1>
            <p className="text-sm font-mono font-bold text-ink-2">
              Add the app to your phone or computer
            </p>
          </div>
        </div>

        <div className="card bg-surface border border-border-strong rounded-lg p-6 mb-6">
          <p className="text-sm font-medium text-ink-2 mb-4">
            PRETAG AMIS is a web app that installs like a normal app &mdash; its own icon, its own
            window, no browser bars, and it opens straight to the sign-in screen. There is nothing to
            download from an app store. If your browser supports one-tap install, the button below
            will do it; otherwise follow the steps for your device.
          </p>
          <InstallApp label="Install now" />
        </div>

        <div className="flex flex-col gap-6">
          <StepCard title="iPhone &amp; iPad" note="Safari">
            <InstallSteps platform="ios" />
          </StepCard>

          <StepCard title="Android phone &amp; tablet" note="Chrome">
            <InstallSteps platform="android" />
          </StepCard>

          <StepCard title="Windows &amp; Mac laptop" note="Chrome or Edge">
            <InstallSteps platform="desktop" />
          </StepCard>
        </div>

        <div className="card bg-surface border border-border-strong rounded-lg p-6 mt-6">
          <h2 className="font-display text-base font-extrabold uppercase tracking-tight mb-2">
            Good to know
          </h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm font-medium text-ink-2">
            <li>You still sign in with your normal email and password.</li>
            <li>
              An internet connection is needed to load membership data &mdash; the app shows a friendly
              &quot;you&apos;re offline&quot; screen if the connection drops.
            </li>
            <li>Updates are automatic. When the app is improved, you get the new version next time you open it.</li>
            <li>To remove it, uninstall it like any other app (long-press the icon, or right-click in the Start menu / Dock).</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-mono font-bold">
          <Link href="/login" className="btn-3d px-4 py-2 uppercase tracking-wide text-xs">
            Go to sign in
          </Link>
          <span className="text-ink-2 text-sm">
            Help:{" "}
            <a href="tel:+233243744689" className="text-ink underline">+233&nbsp;24&nbsp;374&nbsp;4689</a>{" "}
            &middot;{" "}
            <a href="mailto:isaacnyamaa30@gmail.com" className="text-ink underline break-all">isaacnyamaa30@gmail.com</a>
          </span>
        </div>

        <p className="mt-6 text-[11px] font-mono font-bold text-ink-3">
          &copy; {new Date().getFullYear()} Isaac Nyamaa Boadi &middot; all rights reserved
        </p>
      </div>
    </main>
  );
}
