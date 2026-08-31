"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ingestR20 } from "@/lib/r20/import";

type Result = { ok: boolean; text: string };

export async function uploadR20(_prev: Result | null, formData: FormData): Promise<Result> {
  const session = await requireStaff();

  const file = formData.get("file");
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));

  if (!(file instanceof File) || file.size === 0) return { ok: false, text: "Choose an .xlsx file." };
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    return { ok: false, text: "The R20 must be an Excel .xlsx file." };
  if (!month || month < 1 || month > 12) return { ok: false, text: "Pick a month." };
  if (!year || year < 2015 || year > 2100) return { ok: false, text: "Enter a valid year." };

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await ingestR20({
    filename: file.name,
    buffer,
    month,
    year,
    uploadedByUserId: session.profile.id,
  });

  if (!result.ok) return { ok: false, text: result.error };

  await logAudit({
    action: "r20.upload",
    resourceType: "r20_upload",
    resourceId: result.uploadId,
    details: { filename: file.name, month, year, duplicateOf: result.duplicateOf },
  });

  redirect(`/r20/queue/${result.uploadId}${result.duplicateOf ? "?dup=" + result.duplicateOf : ""}`);
}
