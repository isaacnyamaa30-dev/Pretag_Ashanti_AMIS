import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

type AuditInput = {
  action: string;
  resourceType?: string;
  resourceId?: string | number;
  details?: Record<string, unknown>;
};

/** Append an entry to audit_logs for the current user. Best-effort - never throws. */
export async function logAudit({ action, resourceType, resourceId, details }: AuditInput) {
  try {
    const session = await getSessionUser();
    const supabase = createClient();
    await supabase.from("audit_logs").insert({
      user_id: session?.profile?.id ?? null,
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId != null ? String(resourceId) : null,
      details: details ?? null,
    });
  } catch (e) {
    console.error("audit log failed:", e);
  }
}
