import { requireUser } from "@/lib/auth";
import { Tabs } from "@/components/Tabs";

const TABS = [
  { href: "/reports/regional", label: "Regional report" },
  { href: "/reports/movement", label: "Members who left / joined" },
];

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div>
      <Tabs tabs={TABS} />
      {children}
    </div>
  );
}
