/**
 * Global access state - the system developer's "suspend all access" switch,
 * used during the pre-agreement trial. Stored in `settings` under the
 * `access_suspended` key: { suspended: boolean, message: string, updated_at }.
 *
 * When suspended, everyone except the developer account (DEVELOPER_EMAIL) is
 * bounced to /suspended. Read through the service-role client so the check
 * never depends on the caller's own RLS.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export type AccessState = { suspended: boolean; message: string; updatedAt: string | null };

const DEFAULT_MESSAGE =
  "Access to the system has been temporarily suspended by the developer while commercial terms are being finalised. Please contact Isaac Nyamaa Boadi.";

export async function getAccessState(): Promise<AccessState> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("settings")
      .select("value")
      .eq("key", "access_suspended")
      .maybeSingle();
    const v = (data?.value ?? {}) as Partial<{
      suspended: boolean;
      message: string;
      updated_at: string;
    }>;
    return {
      suspended: v.suspended === true,
      message: v.message || DEFAULT_MESSAGE,
      updatedAt: v.updated_at ?? null,
    };
  } catch {
    // never let a settings read failure lock the whole system out
    return { suspended: false, message: DEFAULT_MESSAGE, updatedAt: null };
  }
}

export async function setAccessState(suspended: boolean, message: string): Promise<void> {
  const admin = createAdminClient();
  const value = {
    suspended,
    message: message.trim() || DEFAULT_MESSAGE,
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from("settings")
    .upsert({ key: "access_suspended", value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export { DEFAULT_MESSAGE as DEFAULT_SUSPENSION_MESSAGE };
