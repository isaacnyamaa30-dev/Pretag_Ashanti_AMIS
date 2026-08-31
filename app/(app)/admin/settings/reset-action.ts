"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

type Result = { ok: boolean; text: string };

const BUCKET = process.env.R20_STORAGE_BUCKET || "r20";

async function emptyBucket() {
  const admin = createAdminClient();
  const stack = [""];
  const toDelete: string[] = [];
  while (stack.length) {
    const prefix = stack.pop()!;
    const { data } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 });
    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) stack.push(path); // folder
      else toDelete.push(path);
    }
  }
  for (let i = 0; i < toDelete.length; i += 100) {
    await admin.storage.from(BUCKET).remove(toDelete.slice(i, i + 100));
  }
  return toDelete.length;
}

export async function resetMembershipData(_prev: Result | null, formData: FormData): Promise<Result> {
  const session = await requireAdmin();
  if (session.profile.role !== "Super Administrator") {
    return { ok: false, text: "Only a Super Administrator can do this." };
  }
  if (String(formData.get("confirm")) !== "RESET") {
    return { ok: false, text: 'Type RESET in the box to confirm.' };
  }
  const keepAliases = formData.get("keep_aliases") === "on";

  const supabase = createClient();
  const { data, error } = await supabase.rpc("reset_membership_data", {
    p_keep_aliases: keepAliases,
  });
  if (error) return { ok: false, text: error.message };

  const filesRemoved = await emptyBucket();
  const r = (Array.isArray(data) ? data[0] : data) as {
    cleared_snapshots: number;
    cleared_members: number;
    cleared_uploads: number;
  };

  revalidatePath("/dashboard");
  revalidatePath("/admin/settings");
  return {
    ok: true,
    text: `Cleared ${r.cleared_members} members, ${r.cleared_snapshots} snapshots, ${r.cleared_uploads} uploads and ${filesRemoved} stored files. The system is a clean slate.`,
  };
}
