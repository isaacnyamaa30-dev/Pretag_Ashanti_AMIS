"use client";

import { useEffect, useState } from "react";

/* The browser fires `beforeinstallprompt` on installable PWAs (Chrome / Edge on
   Android + desktop). We stash the event and fire it from our own button so the
   user gets a clear "Install app" affordance instead of hunting through a menu.
   iOS Safari has no such event - there we show the Share -> Add to Home Screen
   steps instead. */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  if (iOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallApp({
  className = "",
  label = "Install app",
}: {
  className?: string;
  label?: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Already running as an installed app - nothing to offer.
  if (installed) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setHelp(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`btn-3d font-mono text-xs font-bold uppercase tracking-wide px-3 py-2 ${className}`}
        aria-haspopup="dialog"
      >
        <span aria-hidden>&#8681; </span>
        {label}
      </button>

      {help && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="How to install the app"
          onClick={() => setHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border-strong bg-surface p-6 shadow-2xl text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-lg font-extrabold uppercase tracking-tight mb-3">
              Install PRETAG AMIS
            </h2>
            <InstallSteps platform={platform} />
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setHelp(false)}
                className="btn-3d font-mono text-xs font-bold uppercase tracking-wide px-4 py-2"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function InstallSteps({ platform }: { platform: Platform }) {
  if (platform === "ios") {
    return (
      <ol className="list-decimal pl-5 space-y-2 text-sm font-medium text-ink-2">
        <li>Open this page in <strong>Safari</strong> (not Chrome) on your iPhone or iPad.</li>
        <li>
          Tap the <strong>Share</strong> button &mdash; the square with an arrow pointing up, at the
          bottom of the screen.
        </li>
        <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
        <li>Tap <strong>Add</strong> in the top-right corner.</li>
        <li>The PRETAG AMIS icon now sits on your home screen like any other app.</li>
      </ol>
    );
  }
  if (platform === "android") {
    return (
      <ol className="list-decimal pl-5 space-y-2 text-sm font-medium text-ink-2">
        <li>Open this page in <strong>Chrome</strong> on your Android phone.</li>
        <li>
          Tap the <strong>three-dot menu</strong> (top-right), then tap{" "}
          <strong>Install app</strong> or <strong>Add to Home screen</strong>.
        </li>
        <li>Tap <strong>Install</strong> to confirm.</li>
        <li>The app opens in its own window and its icon is added to your home screen.</li>
      </ol>
    );
  }
  return (
    <ol className="list-decimal pl-5 space-y-2 text-sm font-medium text-ink-2">
      <li>Open this page in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>.</li>
      <li>
        Look at the right-hand end of the address bar for the <strong>install icon</strong> &mdash; a
        small monitor with a downward arrow. Click it.
      </li>
      <li>
        No icon? Open the browser menu (three dots, top-right) and choose{" "}
        <strong>Cast, save and share &rarr; Install page as app</strong> (Chrome) or{" "}
        <strong>Apps &rarr; Install this site as an app</strong> (Edge).
      </li>
      <li>Click <strong>Install</strong> to confirm.</li>
      <li>
        PRETAG AMIS opens in its own window and is added to your Start menu / Dock. Pin it to the
        taskbar for one-click access.
      </li>
    </ol>
  );
}
