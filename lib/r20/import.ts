/**
 * Upload -> stage -> validate orchestration (build-plan Phase 2).
 * Nothing here touches the permanent membership tables - that is Phase 3.
 */
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { Resolver, type AliasRow, type DistrictRow } from "./mapping";
import { parseWorkbook, validate } from "./parser";

const BUCKET = process.env.R20_STORAGE_BUCKET || "r20";

export type IngestInput = {
  filename: string;
  buffer: Buffer;
  month: number;
  year: number;
  uploadedByUserId: string;
};

export type IngestResult =
  | { ok: true; uploadId: number; duplicateOf: number | null }
  | { ok: false; error: string };

async function buildResolver() {
  const supabase = createClient();
  const [{ data: aliases }, { data: districts }] = await Promise.all([
    supabase.from("district_aliases").select("normalized_alias, district_id"),
    supabase.from("districts").select("id, district_name, zone_id, zones(zone_name)"),
  ]);
  return new Resolver((aliases ?? []) as AliasRow[], (districts ?? []) as DistrictRow[]);
}

export async function ingestR20(input: IngestInput): Promise<IngestResult> {
  const supabase = createClient();
  const { filename, buffer, month, year, uploadedByUserId } = input;

  const fileHash = createHash("sha256").update(buffer).digest("hex");

  // duplicate-upload guard (blueprint section 52)
  const { data: existing } = await supabase
    .from("r20_uploads")
    .select("id")
    .eq("file_hash", fileHash)
    .limit(1)
    .maybeSingle();

  // reporting period (create if missing)
  const label = new Date(year, month - 1, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
  let { data: period } = await supabase
    .from("reporting_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  if (!period) {
    const ins = await supabase
      .from("reporting_periods")
      .insert({ year, month, label })
      .select("id")
      .single();
    if (ins.error) return { ok: false, error: ins.error.message };
    period = ins.data;
  }

  // store the original file
  const storagePath = `${year}/${String(month).padStart(2, "0")}/${Date.now()}_${filename}`;
  const up = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    upsert: false,
  });
  if (up.error) return { ok: false, error: `storage: ${up.error.message}` };

  const { data: upload, error: upErr } = await supabase
    .from("r20_uploads")
    .insert({
      period_id: period.id,
      original_filename: filename,
      storage_path: storagePath,
      file_hash: fileHash,
      status: "validating",
      uploaded_by: uploadedByUserId,
    })
    .select("id")
    .single();
  if (upErr) return { ok: false, error: upErr.message };

  try {
    const resolver = await buildResolver();
    const parsed = await parseWorkbook(buffer);
    const summary = validate(parsed, resolver);

    // stage the rows
    if (parsed.rows.length) {
      const stageRows = parsed.rows.map((r) => ({
        upload_id: upload.id,
        sheet_name: r.sheet,
        row_number: r.excelRow,
        employee_no_raw: r.employeeNo || null,
        employee_name_raw: r.name || null,
        management_unit_raw: r.managementUnit || null,
        district_raw: r.rawDistrict || null,
        region_raw: r.rawRegion || null,
        normalized_employee_no: r.employeeNo || null,
        normalized_district: r.rawDistrict || null,
        mapped_district_id: r.districtId,
        mapped_zone_id: r.zoneId,
        validation_status: r.status,
        validation_message: r.message,
      }));
      // 1000-row batches keep each request well under body limits while
      // minimising round trips. A ~7k-row R20 stages in a few seconds.
      for (let i = 0; i < stageRows.length; i += 1000) {
        const { error } = await supabase.from("r20_staging_rows").insert(stageRows.slice(i, i + 1000));
        if (error) throw new Error(error.message);
      }
    }

    await supabase
      .from("r20_uploads")
      .update({
        status: summary.status === "validated" ? "validated" : "needs_review",
        total_rows: summary.totalRows,
        valid_rows: summary.validRows,
        invalid_rows: summary.totalRows - summary.validRows,
        duplicate_rows: summary.duplicateEmployeeNos,
        unmapped_rows: summary.unmappedRows,
        blank_rows: summary.blankRowsDropped,
        processing_notes: JSON.stringify({
          sheetsRead: summary.sheetsRead,
          sheetsSkipped: summary.sheetsSkipped,
          missingEmployeeNo: summary.missingEmployeeNo,
        }),
      })
      .eq("id", upload.id);

    return { ok: true, uploadId: upload.id, duplicateOf: existing?.id ?? null };
  } catch (e) {
    await supabase
      .from("r20_uploads")
      .update({ status: "failed", processing_notes: String(e) })
      .eq("id", upload.id);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
