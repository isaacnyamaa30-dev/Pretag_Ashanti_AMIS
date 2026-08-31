"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const REASONS = [
  "retirement", "transfer", "union_switch", "payroll_correction",
  "termination", "death", "duplicate_correction", "unknown", "other",
] as const;

export async function setMovementReason(formData: FormData) {
  await requireStaff();
  const employeeNo = String(formData.get("employee_no") ?? "");
  const periodId = Number(formData.get("period_id"));
  const kind = String(formData.get("kind") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!employeeNo || !periodId) return;
  const movement_type =
    kind === "added" ? "added" : kind === "missing" ? "missing" : "internal";
  if (reason && !REASONS.includes(reason as (typeof REASONS)[number])) return;

  const supabase = createClient();
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("employee_no", employeeNo)
    .maybeSingle();
  if (!member) return;

  if (!reason) {
    await supabase
      .from("membership_movement_reasons")
      .delete()
      .eq("member_id", member.id)
      .eq("period_id", periodId)
      .eq("movement_type", movement_type);
  } else {
    await supabase.from("membership_movement_reasons").upsert(
      {
        member_id: member.id,
        period_id: periodId,
        movement_type,
        reason,
        notes,
      },
      { onConflict: "member_id,period_id,movement_type" },
    );
  }
  await logAudit({
    action: "movement.reason",
    resourceType: "member",
    resourceId: member.id,
    details: { employeeNo, periodId, movement_type, reason: reason || null },
  });
  revalidatePath("/analytics/movement");
}
