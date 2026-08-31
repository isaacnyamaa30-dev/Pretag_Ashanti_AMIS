"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function updateZone(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const zone_name = String(formData.get("zone_name") ?? "").trim();
  const zone_code = String(formData.get("zone_code") ?? "").trim().toUpperCase();
  if (!id || !zone_name || !zone_code) return;

  const supabase = createClient();
  const { error } = await supabase.from("zones").update({ zone_name, zone_code }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit({ action: "zone.update", resourceType: "zone", resourceId: id, details: { zone_name, zone_code } });
  revalidatePath("/admin/zones");
}

export async function toggleZoneActive(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const is_active = formData.get("is_active") === "true";
  const supabase = createClient();
  const { error } = await supabase.from("zones").update({ is_active: !is_active }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit({ action: "zone.toggle_active", resourceType: "zone", resourceId: id, details: { is_active: !is_active } });
  revalidatePath("/admin/zones");
}
