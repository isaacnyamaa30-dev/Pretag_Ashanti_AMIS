import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser, isDeveloper } from "@/lib/auth";
import { getAccessState } from "@/lib/access";
import { Sidebar } from "@/components/Sidebar";
import { SignOutButton } from "@/components/SignOutButton";
import { InstallApp } from "@/components/InstallApp";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const supabase = createClient();
  const user = { id: session.authId, email: session.email };

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email, roles(role_name)")
    .eq("auth_id", user.id)
    .maybeSingle();

  const roleName =
    (profile?.roles as { role_name?: string } | null)?.role_name ?? "No role assigned";
  const dev = isDeveloper(session.email);
  const access = dev ? await getAccessState() : { suspended: false, message: "" };

  let unread = 0;
  if (profile?.id) {
    const [{ count: total }, { count: read }] = await Promise.all([
      supabase.from("notifications").select("*", { count: "exact", head: true }),
      supabase
        .from("notification_reads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id),
    ]);
    unread = Math.max(0, (total ?? 0) - (read ?? 0));
  }

  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar isDeveloper={dev} />
      <div className="flex-1 flex flex-col min-w-0">
        {dev && access.suspended && (
          <div className="bg-decline text-on-primary text-center text-xs font-mono font-bold px-4 py-1.5">
            You have SUSPENDED all access for other users. Resume it from the Developer console.
          </div>
        )}
        <header className="h-16 border-b border-border-strong bg-surface flex items-center justify-between px-6">
          <div className="text-[15px] font-mono font-bold text-ink-2">Ashanti Regional R20</div>
          <div className="flex items-center gap-5">
            <InstallApp />
            <Link
              href="/notifications"
              className="relative font-mono text-sm font-bold uppercase tracking-wide text-ink-2 hover:text-primary"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            >
              Alerts
              {unread > 0 && (
                <span className="absolute -top-2.5 -right-4 bg-primary text-on-primary rounded-full text-[11px] font-bold px-1.5 py-0.5 leading-none shadow">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <div className="text-right leading-tight">
              <div className="text-[15px] font-bold text-ink">{profile?.full_name ?? user.email}</div>
              <div className="text-xs font-mono font-bold text-ink-3">{roleName}</div>
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full">{children}</main>
        <footer className="border-t border-border-strong px-6 py-4 text-[13px] font-mono font-bold text-ink flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>PRETAG Ashanti Membership Intelligence System</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="uppercase tracking-wide text-ink-2">Enquiries &amp; services:</span>
            <a href="tel:+233243744689" className="text-ink underline decoration-2 text-sm">
              +233&nbsp;24&nbsp;374&nbsp;4689
            </a>
            <span aria-hidden>&middot;</span>
            <a href="mailto:isaacnyamaa30@gmail.com" className="text-ink underline decoration-2 text-sm break-all">
              isaacnyamaa30@gmail.com
            </a>
          </span>
          <span>&copy; {new Date().getFullYear()} Isaac Nyamaa Boadi &mdash; All Rights Reserved</span>
        </footer>
      </div>
    </div>
  );
}
