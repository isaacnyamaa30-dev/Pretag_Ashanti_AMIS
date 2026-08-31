import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const TABS = [
  { href: "/admin/zones", label: "Zones" },
  { href: "/admin/districts", label: "Districts" },
  { href: "/admin/aliases", label: "District Aliases" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/targets", label: "Targets" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <nav className="flex flex-wrap gap-1 border-b border-border mb-6">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-3 py-2 text-sm font-mono text-ink-2 hover:text-ink border-b-2 border-transparent hover:border-border-strong -mb-px"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
