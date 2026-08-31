"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function updateDistrict(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const district_name = String(formData.get("district_name") ?? "").trim();
  const district_code = String(formData.get("district_code") ?? "").trim().toUpperCase();
  const zone_id = Number(formData.get("zone_id"));
  if (!id || !district_name || !zone_id) return;

  const supabase = createClient();
  const { error } = await supabase
    .from("districts")
    .update({ district_name, district_code, zone_id })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit({
    action: "district.update",
    resourceType: "district",
    resourceId: id,
    details: { district_name, district_code, zone_id },
  });
  revalidatePath("/admin/districts");
}

export async function toggleDistrictActive(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const is_active = formData.get("is_active") === "true";
  const supabase = createClient();
  const { error } = await supabase.from("districts").update({ is_active: !is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit({ action: "district.toggle_active", resourceType: "district", resourceId: id });
  revalidatePath("/admin/districts");
}
