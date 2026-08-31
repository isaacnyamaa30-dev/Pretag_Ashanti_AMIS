import { requireUser } from "@/lib/auth";

export default async function CompareLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
