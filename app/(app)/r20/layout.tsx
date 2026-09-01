import { requireStaff } from "@/lib/auth";
import { Tabs } from "@/components/Tabs";

const TABS = [
  { href: "/r20/upload", label: "Upload R20" },
  { href: "/r20/queue", label: "Validation Queue" },
  { href: "/r20/history", label: "Import History" },
  { href: "/r20/archive", label: "Archive" },
];

export default async function R20Layout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div>
      <Tabs tabs={TABS} />
      {children}
    </div>
  );
}
