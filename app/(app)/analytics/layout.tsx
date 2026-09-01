import { requireUser } from "@/lib/auth";
import { Tabs } from "@/components/Tabs";

const TABS = [
  { href: "/analytics/regional", label: "Regional" },
  { href: "/analytics/zones", label: "Zones" },
  { href: "/analytics/districts", label: "Districts" },
  { href: "/analytics/movement", label: "Movement" },
  { href: "/analytics/scorecard", label: "Scorecard" },
  { href: "/compare/monthly", label: "Compare" },
];

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div>
      <Tabs tabs={TABS} />
      {children}
    </div>
  );
}
