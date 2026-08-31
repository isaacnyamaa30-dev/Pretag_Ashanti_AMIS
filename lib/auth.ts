import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
