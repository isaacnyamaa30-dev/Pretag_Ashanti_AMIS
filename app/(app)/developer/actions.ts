"use server";

import { revalidatePath } from "next/cache";
import { requireDeveloper, DEVELOPER_EMAIL } from "@/lib/auth";
import { setAccessState } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

type Result = { ok: boolean; text: string };

/** Flip the global "suspend all access" switch. */
export async function toggleSuspension(_prev: Result | null, formData: FormData): Promise<Result> {
  await requireDeveloper();
  const suspend = formData.get("suspend") === "true";
  const message = String(formData.get("message") ?? "");
  if (formData.get("confirm") !== (suspend ? "SUSPEND" : "RESUME")) {
    return { ok: false, text: `Type ${suspend ? "SUSPEND" : "RESUME"} to confirm.` };
  }
  await setAccessState(suspend, message);
  await logAudit({ action: suspend ? "access.suspend" : "access.resume", resourceType: "settings" });
  revalidatePath("/developer");
  revalidatePath("/dashboard");
  return {
    ok: true,
    text: suspend
      ? "All access is now suspended. Only your owner account can sign in."
      : "Access restored. Everyone can sign in again.",
  };
}

async function targetAuthId(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("users").select("id, auth_id, email").eq("id", userId).maybeSingle();
  return data ?? null;
}

/** Set a brand-new sign-in password for any account. */
export async function setUserPassword(_prev: Result | null, formData: FormData): Promise<Result> {
  await requireDeveloper();
  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { ok: false, text: "Use at least 8 characters." };
  const target = await targetAuthId(userId);
  if (!target?.auth_id) return { ok: false, text: "Account not found." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(target.auth_id, { password });
  if (error) return { ok: false, text: error.message };
  await logAudit({ action: "dev.reset_password", resourceType: "user", resourceId: userId });
  revalidatePath("/developer");
  return { ok: true, text: `New password set for ${target.email}. Their current sessions will end shortly.` };
}

/** Move an account to a different email address. */
export async function setUserEmail(_prev: Result | null, formData: FormData): Promise<Result> {
  await requireDeveloper();
  const userId = String(formData.get("user_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, text: "Enter a valid email address." };
  const target = await targetAuthId(userId);
  if (!target?.auth_id) return { ok: false, text: "Account not found." };
  if (target.email?.toLowerCase() === DEVELOPER_EMAIL && email !== DEVELOPER_EMAIL) {
    return { ok: false, text: "Change DEVELOPER_EMAIL in the environment before moving the owner account." };
  }

  const admin = createAdminClient();
  const { error: authErr } = await admin.auth.admin.updateUserById(target.auth_id, {
    email,
    email_confirm: true,
  });
  if (authErr) return { ok: false, text: authErr.message };
  const { error } = await admin.from("users").update({ email }).eq("id", userId);
  if (error) return { ok: false, text: error.message };
  await logAudit({ action: "dev.change_email", resourceType: "user", resourceId: userId, details: { email } });
  revalidatePath("/developer");
  revalidatePath("/admin/users");
  return { ok: true, text: `Account moved to ${email}.` };
}

/** Disable or enable any account. A disabled account is bounced to /suspended. */
export async function setUserActive(_prev: Result | null, formData: FormData): Promise<Result> {
  await requireDeveloper();
  const userId = String(formData.get("user_id") ?? "");
  const active = formData.get("active") === "true";
  const target = await targetAuthId(userId);
  if (!target) return { ok: false, text: "Account not found." };
  if (target.email?.toLowerCase() === DEVELOPER_EMAIL && !active) {
    return { ok: false, text: "You cannot disable your own owner account." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ is_active: active }).eq("id", userId);
  if (error) return { ok: false, text: error.message };
  await logAudit({
    action: active ? "dev.enable_user" : "dev.disable_user",
    resourceType: "user",
    resourceId: userId,
  });
  revalidatePath("/developer");
  revalidatePath("/admin/users");
  return { ok: true, text: `${target.email} is now ${active ? "enabled" : "disabled"}.` };
}
