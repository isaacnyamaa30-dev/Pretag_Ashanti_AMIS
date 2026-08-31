import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Notifications - PRETAG AMIS" };

async function markAllRead() {
  "use server";
  const session = await requireUser();
  if (!session.profile) return;
  const supabase = createClient();
  const { data: notes } = await supabase.from("notifications").select("id");
  const rows = (notes ?? []).map((n) => ({ notification_id: n.id, user_id: session.profile!.id }));
  if (rows.length) await supabase.from("notification_reads").upsert(rows, { onConflict: "notification_id,user_id" });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

const ICON: Record<string, string> = { import: "▸", data_quality: "!", decline: "▼", system: "•" };

export default async function NotificationsPage() {
  const session = await requireUser();
  const supabase = createClient();
  const [{ data: notes }, { data: reads }] = await Promise.all([
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("notification_reads").select("notification_id").eq("user_id", session.profile?.id ?? ""),
  ]);
  const readSet = new Set((reads ?? []).map((r) => r.notification_id));

  return (
    <>
      <div className="flex items-center justify-between">
        <PageHeader title="Notifications" />
        <form action={markAllRead}>
          <button className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5 text-ink-2 hover:border-primary hover:text-primary">
            Mark all read
          </button>
        </form>
      </div>

      {!notes?.length ? (
        <p className="text-ink-3 font-mono text-sm">Nothing yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((n) => {
            const unread = !readSet.has(n.id);
            const body = (
              <div
                className={`border rounded px-4 py-3 ${
                  unread ? "border-primary/40 bg-brand-wash/40" : "border-border bg-surface"
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-primary">{ICON[n.kind] ?? "•"}</span>
                  <span className="font-medium">{n.title}</span>
                  {unread && <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-label="unread" />}
                </div>
                {n.body && <p className="text-sm text-ink-2 mt-1">{n.body}</p>}
                <p className="text-[11px] font-mono text-ink-3 mt-1">
                  {new Date(n.created_at).toLocaleString("en-GB")}
                </p>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link}>{body}</Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </>
  );
}
