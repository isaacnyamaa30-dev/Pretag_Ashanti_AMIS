import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessState } from "@/lib/access";

/**
 * The system developer / owner. Set DEVELOPER_EMAIL in the environment to the
 * address of the private owner account. Only that account can open the
 * Developer console, flip the global "suspend all access" switch, or reset
 * other people's sign-in credentials. It is never locked out by suspension.
 */
export const DEVELOPER_EMAIL = (process.env.DEVELOPER_EMAIL ?? "").trim().toLowerCase();

export function isDeveloper(email?: string | null): boolean {
  return !!DEVELOPER_EMAIL && !!email && email.trim().toLowerCase() === DEVELOPER_EMAIL;
}

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  scope: "region" | "zone" | "district";
  zone_id: number | null;
  district_id: number | null;
  is_active: boolean;
  role: string;
};

const ADMIN_ROLES = ["Super Administrator", "Regional Administrator"];
const STAFF_ROLES = [...ADMIN_ROLES, "Regional Executive", "Regional Data Officer"];

/** Signed-in user + linked profile, or null. */
export async function getSessionUser(): Promise<{ authId: string; email: string; profile: Profile | null } | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, full_name, email, scope, zone_id, district_id, is_active, roles(role_name)")
    .eq("auth_id", user.id)
    .maybeSingle();

  const profile: Profile | null = data
    ? {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        scope: data.scope,
        zone_id: data.zone_id,
        district_id: data.district_id,
        is_active: data.is_active,
        role: (data.roles as { role_name?: string } | null)?.role_name ?? "",
      }
    : null;

  return { authId: user.id, email: user.email ?? "", profile };
}

export async function requireUser() {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  if (!isDeveloper(session.email)) {
    // the developer's global suspension switch
    const access = await getAccessState();
    if (access.suspended) redirect("/suspended");
    // an individually disabled account
    if (session.profile && session.profile.is_active === false) redirect("/suspended?a=1");
  }
  return session;
}

export async function requireDeveloper() {
  const session = await requireUser();
  if (!isDeveloper(session.email)) redirect("/dashboard?denied=1");
  return session;
}

export async function requireStaff() {
  const session = await requireUser();
  if (!session.profile || !STAFF_ROLES.includes(session.profile.role)) {
    redirect("/dashboard?denied=1");
  }
  return session as { authId: string; email: string; profile: Profile };
}

export async function requireAdmin() {
  const session = await requireUser();
  if (!session.profile || !ADMIN_ROLES.includes(session.profile.role)) {
    redirect("/dashboard?denied=1");
  }
  return session as { authId: string; email: string; profile: Profile };
}

export const isAdmin = (role?: string) => !!role && ADMIN_ROLES.includes(role);
export const isStaff = (role?: string) => !!role && STAFF_ROLES.includes(role);
export { ADMIN_ROLES, STAFF_ROLES };
