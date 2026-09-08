import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function UnreadCount({ userId }: { userId: string }) {
  const supabase = createClient();
  const [{ count: total }, { count: read }] = await Promise.all([
    supabase.from("notifications").select("*", { count: "exact", head: true }),
    supabase
      .from("notification_reads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  const unread = Math.max(0, (total ?? 0) - (read ?? 0));
  if (unread === 0) return null;
  return (
    <span className="absolute -top-2.5 -right-4 bg-primary text-on-primary rounded-full text-[11px] font-bold px-1.5 py-0.5 leading-none shadow">
      {unread > 9 ? "9+" : unread}
    </span>
  );
}

/**
 * The "Alerts" header link. The unread badge is streamed in its own Suspense
 * boundary so the two notification-count queries never hold up the app shell.
 */
export function AlertsLink({ userId }: { userId?: string }) {
  return (
    <Link
      href="/notifications"
      className="relative font-mono text-sm font-bold uppercase tracking-wide text-ink-2 hover:text-primary"
      aria-label="Notifications"
    >
      Alerts
      {userId && (
        <Suspense fallback={null}>
          <UnreadCount userId={userId} />
        </Suspense>
      )}
    </Link>
  );
}
