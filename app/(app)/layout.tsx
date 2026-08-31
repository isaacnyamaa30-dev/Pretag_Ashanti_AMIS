import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, roles(role_name)")
    .eq("auth_id", user.id)
    .maybeSingle();

  const roleName =
    (profile?.roles as { role_name?: string } | null)?.role_name ?? "No role assigned";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6">
          <div className="text-sm font-mono text-ink-3">Ashanti Regional R20</div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right leading-tight">
              <div className="text-ink">{profile?.full_name ?? user.email}</div>
              <div className="text-[11px] font-mono text-ink-3">{roleName}</div>
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full">{children}</main>
        <footer className="border-t border-border px-6 py-3 text-[11px] font-mono text-ink-3 flex flex-wrap gap-x-4 gap-y-1 justify-between">
          <span>PRETAG Ashanti Membership Intelligence System</span>
          <span>&copy; {new Date().getFullYear()} Isaac Nyamaa Boadi &mdash; all rights reserved</span>
        </footer>
      </div>
    </div>
  );
}
