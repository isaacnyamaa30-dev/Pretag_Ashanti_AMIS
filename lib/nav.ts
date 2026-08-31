/** Primary navigation (blueprint section 28). `ready: false` items are still
 *  placeholders; everything else routes to a live page. */
export type NavItem = { label: string; href: string; ready?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", ready: true }] },
  {
    label: "R20 Centre",
    items: [
      { label: "Upload R20", href: "/r20/upload", ready: true },
      { label: "Validation Queue", href: "/r20/queue", ready: true },
      { label: "Import History", href: "/r20/history", ready: true },
      { label: "Archive", href: "/r20/archive", ready: true },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Regional", href: "/analytics/regional", ready: true },
      { label: "Zones", href: "/analytics/zones", ready: true },
      { label: "Districts", href: "/analytics/districts", ready: true },
      { label: "Membership Movement", href: "/analytics/movement", ready: true },
      { label: "Zone Scorecard", href: "/analytics/scorecard", ready: true },
    ],
  },
  {
    label: "Compare",
    items: [
      { label: "Monthly", href: "/compare/monthly", ready: true },
      { label: "Multi-Month", href: "/compare/multi", ready: true },
    ],
  },
  {
    label: "Assistant",
    items: [{ label: "Ask", href: "/assistant", ready: true }],
  },
  {
    label: "Members",
    items: [{ label: "Search", href: "/members", ready: true }],
  },
  {
    label: "Reports",
    items: [{ label: "Regional Report", href: "/reports/regional", ready: true }],
  },
  {
    label: "Export Centre",
    items: [{ label: "Zone R20s", href: "/exports", ready: true }],
  },
  {
    label: "Administration",
    items: [
      { label: "Zones", href: "/admin/zones", ready: true },
      { label: "Districts", href: "/admin/districts", ready: true },
      { label: "District Aliases", href: "/admin/aliases", ready: true },
      { label: "Users", href: "/admin/users", ready: true },
      { label: "Targets", href: "/admin/targets", ready: true },
      { label: "Settings", href: "/admin/settings", ready: true },
    ],
  },
];
