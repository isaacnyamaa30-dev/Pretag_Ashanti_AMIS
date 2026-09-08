import { requireUser, isDeveloper } from "@/lib/auth";
import { getAccessState } from "@/lib/access";
import { Sidebar } from "@/components/Sidebar";
import { SidebarToggle } from "@/components/SidebarToggle";
import { NavProvider } from "@/components/nav/NavContext";
import { SignOutButton } from "@/components/SignOutButton";
import { InstallApp } from "@/components/InstallApp";
import { AlertsLink } from "@/components/AlertsLink";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  const dev = isDeveloper(session.email);
  const access = dev ? await getAccessState() : { suspended: false };

  const roleName = session.profile?.role || "No role assigned";
  const displayName = session.profile?.full_name ?? session.email;

  return (
    <NavProvider>
    <div className="app-shell flex min-h-screen">
      <Sidebar isDeveloper={dev} />
      <div className="flex-1 flex flex-col min-w-0">
        {dev && access.suspended && (
          <div className="bg-decline text-on-primary text-center text-xs font-mono font-bold px-4 py-1.5">
            You have SUSPENDED all access for other users. Resume it from the Developer console.
          </div>
        )}
        <header className="h-16 border-b border-border-strong bg-surface flex items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarToggle />
            <div className="text-[13px] sm:text-[15px] font-mono font-bold text-ink-2 truncate">Ashanti Regional R20</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-5">
            <span className="hidden sm:inline-flex">
              <InstallApp />
            </span>
            <AlertsLink userId={session.profile?.id} />
            <div className="hidden md:block text-right leading-tight">
              <div className="text-[15px] font-bold text-ink">{displayName}</div>
              <div className="text-xs font-mono font-bold text-ink-3">{roleName}</div>
            </div>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full min-w-0">{children}</main>
        <footer className="border-t border-border-strong px-4 sm:px-6 py-4 text-[13px] font-mono font-bold text-ink flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>PRETAG Ashanti Membership Intelligence System</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="uppercase tracking-wide text-ink-2">Enquiries &amp; services:</span>
            <a href="tel:+233241176269" className="text-ink underline decoration-2 text-sm">
              +233&nbsp;24&nbsp;117&nbsp;6269
            </a>
            <span aria-hidden>&middot;</span>
            <a href="mailto:sarisitsolution@gmail.com" className="text-ink underline decoration-2 text-sm break-all">
              sarisitsolution@gmail.com
            </a>
          </span>
          <span>&copy; {new Date().getFullYear()} Saris IT Solution &mdash; All Rights Reserved</span>
        </footer>
      </div>
    </div>
    </NavProvider>
  );
}
