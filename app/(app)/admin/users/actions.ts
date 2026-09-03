"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, isDeveloper, DEVELOPER_EMAIL } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/** The owner account can only be changed by the developer, never by another
 *  administrator (e.g. the shared trial login). */
async function assertMayEditUser(callerEmail: string, userId: string) {
  if (isDeveloper(callerEmail)) return;
  const admin = createAdminClient();
  const { data } = await admin.from("users").select("email").eq("id", userId).maybeSingle();
  if ((data?.email ?? "").toLowerCase() === DEVELOPER_EMAIL) {
    throw new Error("This account is managed by the system developer and cannot be changed here.");
  }
}

type Result = { ok: boolean; text: string };

function scopeIds(formData: FormData) {
  const scope = String(formData.get("scope") ?? "region") as "region" | "zone" | "district";
  const zone_id = scope === "zone" ? Number(formData.get("zone_id")) || null : null;
  const district_id = scope === "district" ? Number(formData.get("district_id")) || null : null;
  return { scope, zone_id, district_id };
}

export async function createUser(_prev: Result | null, formData: FormData): Promise<Result> {
  await requireAdmin();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role_id = Number(formData.get("role_id"));
  const { scope, zone_id, district_id } = scopeIds(formData);

  if (!full_name || !email || !password || !role_id) {
    return { ok: false, text: "Name, email, password and role are all required." };
  }
  if (password.length < 8) return { ok: false, text: "Password must be at least 8 characters." };
  if (scope === "zone" && !zone_id) return { ok: false, text: "Pick a zone for a Zone-scoped user." };
  if (scope === "district" && !district_id)
    return { ok: false, text: "Pick a district for a District-scoped user." };

  const admin = createAdminClient();
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr) return { ok: false, text: authErr.message };

  const supabase = createClient();
  const { error } = await supabase.from("users").insert({
    auth_id: authUser.user.id,
    full_name,
    email,
    role_id,
    scope,
    zone_id,
    district_id,
  });
  if (error) {
    await admin.auth.admin.deleteUser(authUser.user.id); // roll back the orphan auth user
    return { ok: false, text: error.message };
  }
  await logAudit({ action: "user.create", resourceType: "user", details: { email, role_id, scope } });
  revalidatePath("/admin/users");
  return { ok: true, text: `Created ${email}.` };
}

export async function updateUser(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  await assertMayEditUser(session.profile.email, id);
  const role_id = Number(formData.get("role_id"));
  const { scope, zone_id, district_id } = scopeIds(formData);
  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ role_id, scope, zone_id, district_id })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit({ action: "user.update", resourceType: "user", resourceId: id, details: { role_id, scope } });
  revalidatePath("/admin/users");
}

export async function toggleUserActive(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id"));
  await assertMayEditUser(session.profile.email, id);
  const is_active = formData.get("is_active") === "true";
  const supabase = createClient();
  const { error } = await supabase.from("users").update({ is_active: !is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit({ action: "user.toggle_active", resourceType: "user", resourceId: id });
  revalidatePath("/admin/users");
}
