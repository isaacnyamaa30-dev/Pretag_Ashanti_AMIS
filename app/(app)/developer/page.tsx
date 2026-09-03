import { requireDeveloper, DEVELOPER_EMAIL } from "@/lib/auth";
import { getAccessState } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Card } from "@/components/ui";
import { DeveloperConsole } from "@/components/DeveloperConsole";

export const metadata = { title: "Developer - PRETAG AMIS" };
export const dynamic = "force-dynamic";

export default async function DeveloperPage() {
  await requireDeveloper();

  const admin = createAdminClient();
  const [{ data: users }, access, authList] = await Promise.all([
    admin
      .from("users")
      .select("id, full_name, email, is_active, auth_id, roles(role_name)")
      .order("full_name"),
    getAccessState(),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ]);

  const lastSignIn = new Map<string, string | null>();
  for (const u of authList.data?.users ?? []) lastSignIn.set(u.id, u.last_sign_in_at ?? null);

  const rows = (users ?? []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    isActive: u.is_active,
    role: (u.roles as { role_name?: string } | null)?.role_name ?? "-",
    isOwner: (u.email ?? "").toLowerCase() === DEVELOPER_EMAIL,
    lastSignIn: u.auth_id ? lastSignIn.get(u.auth_id) ?? null : null,
  }));

  return (
    <>
      <PageHeader
        title="Developer Console"
        sub="Owner-only. Control sign-in credentials and access to the whole system while commercial terms are being finalised."
      />

      {!DEVELOPER_EMAIL && (
        <Card className="mb-6 border-decline/40 bg-decline-wash/40">
          <p className="text-sm text-decline font-mono">
            DEVELOPER_EMAIL is not set in the environment. Set it to your owner account&apos;s email
            and redeploy for this console to be protected.
          </p>
        </Card>
      )}

      <DeveloperConsole
        users={rows}
        suspended={access.suspended}
        message={access.message}
        updatedAt={access.updatedAt}
      />
    </>
  );
}
