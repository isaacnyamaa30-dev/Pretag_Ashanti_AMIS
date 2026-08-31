import { requireUser } from "@/lib/auth";

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
