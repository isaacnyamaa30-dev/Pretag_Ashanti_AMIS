"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { normKey } from "@/lib/r20/normalize";

export async function addAlias(formData: FormData) {
  await requireAdmin();
  const district_id = Number(formData.get("district_id"));
  const alias = String(formData.get("alias") ?? "").trim();
  if (!district_id || !alias) return;
  const normalized_alias = normKey(alias);

  const supabase = createClient();
  const { error } = await supabase
    .from("district_aliases")
    .insert({ district_id, alias, normalized_alias });
  if (error) throw new Error(error.message);
  await logAudit({
    action: "alias.add",
    resourceType: "district_alias",
    details: { alias, normalized_alias, district_id },
  });
  revalidatePath("/admin/aliases");
}

export async function deleteAlias(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id) return;
  const supabase = createClient();
  const { error } = await supabase.from("district_aliases").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit({ action: "alias.delete", resourceType: "district_alias", resourceId: id });
  revalidatePath("/admin/aliases");
}
