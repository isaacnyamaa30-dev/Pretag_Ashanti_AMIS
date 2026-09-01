import { requireAdmin } from "@/lib/auth";
import { Tabs } from "@/components/Tabs";

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
      <Tabs tabs={TABS} />
      {children}
    </div>
  );
}
