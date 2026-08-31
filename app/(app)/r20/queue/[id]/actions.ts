"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normKey } from "@/lib/r20/normalize";

export async function approveUpload(formData: FormData) {
  await requireStaff();
  const uploadId = Number(formData.get("upload_id"));
  if (!uploadId) return;
  const supabase = createClient();

  const { data, error } = await supabase.rpc("import_upload", { p_upload_id: uploadId });
  if (error) throw new Error(error.message);
  const result = Array.isArray(data) ? data[0] : data;

  await logAudit({
    action: "r20.import",
    resourceType: "r20_upload",
    resourceId: uploadId,
    details: result as Record<string, unknown>,
  });
  revalidatePath(`/r20/queue/${uploadId}`);
  revalidatePath("/dashboard");
  redirect(`/r20/queue/${uploadId}?imported=1`);
}

export async function setPeriodLock(formData: FormData) {
  await requireAdmin();
  const periodId = Number(formData.get("period_id"));
  const lock = formData.get("lock") === "true";
  const uploadId = Number(formData.get("upload_id"));
  if (!periodId) return;
  const supabase = createClient();
  const { error } = await supabase.rpc("set_period_lock", { p_period_id: periodId, p_lock: lock });
  if (error) throw new Error(error.message);
  await logAudit({ action: lock ? "period.lock" : "period.unlock", resourceType: "reporting_period", resourceId: periodId });
  if (uploadId) revalidatePath(`/r20/queue/${uploadId}`);
}

/** Map an unmapped district string to a district: saves the alias, then re-resolves
 *  every staging row for this upload that used that string, and recomputes counts. */
export async function resolveUnmapped(formData: FormData) {
  const session = await requireStaff();
  const uploadId = Number(formData.get("upload_id"));
  const districtRaw = String(formData.get("district_raw") ?? "");
  const districtId = Number(formData.get("district_id"));
  if (!uploadId || !districtRaw || !districtId) return;

  const supabase = createClient();

  const { data: district } = await supabase
    .from("districts")
    .select("id, zone_id")
    .eq("id", districtId)
    .single();
  if (!district) return;

  // save the alias for future imports
  await supabase
    .from("district_aliases")
    .upsert(
      { district_id: districtId, alias: districtRaw, normalized_alias: normKey(districtRaw) },
      { onConflict: "normalized_alias" },
    );

  // re-resolve the affected staging rows
  const { data: affected } = await supabase
    .from("r20_staging_rows")
    .select("id, employee_no_raw, validation_message")
    .eq("upload_id", uploadId)
    .eq("district_raw", districtRaw);

  for (const row of affected ?? []) {
    const remaining = String(row.validation_message ?? "")
      .split("; ")
      .filter((m: string) => m.length > 0 && !m.startsWith("unmapped district"))
      .join("; ");
    const stillBad = remaining.length > 0;
    await supabase
      .from("r20_staging_rows")
      .update({
        mapped_district_id: districtId,
        mapped_zone_id: district.zone_id,
        validation_message: remaining || null,
        validation_status: stillBad ? "error" : "valid",
      })
      .eq("id", row.id);
  }

  await recomputeCounts(uploadId);
  await logAudit({
    action: "r20.resolve_unmapped",
    resourceType: "r20_upload",
    resourceId: uploadId,
    details: { district_raw: districtRaw, district_id: districtId, rows: affected?.length ?? 0 },
  });
  revalidatePath(`/r20/queue/${uploadId}`);
}

async function recomputeCounts(uploadId: number) {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("r20_staging_rows")
    .select("validation_status, validation_message, employee_no_raw, mapped_zone_id")
    .eq("upload_id", uploadId);

  const list = rows ?? [];
  const valid = list.filter((r) => r.validation_status === "valid").length;
  const unmapped = list.filter((r) => (r.validation_message ?? "").includes("unmapped district")).length;
  const dupes = new Set(
    list.filter((r) => (r.validation_message ?? "").includes("duplicate employee number")).map((r) => r.employee_no_raw),
  ).size;
  const missing = list.filter((r) => !r.employee_no_raw).length;

  await supabase
    .from("r20_uploads")
    .update({
      valid_rows: valid,
      invalid_rows: list.length - valid,
      unmapped_rows: unmapped,
      duplicate_rows: dupes,
      status: unmapped || dupes || missing ? "needs_review" : "validated",
    })
    .eq("id", uploadId);
}
