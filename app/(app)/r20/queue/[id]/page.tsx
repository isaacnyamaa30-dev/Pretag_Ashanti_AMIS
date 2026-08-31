import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card, StatTile } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { classifyUpload } from "@/lib/r20/classification";
import { resolveUnmapped, approveUpload, setPeriodLock } from "./actions";

export const metadata = { title: "Validation - PRETAG AMIS" };

export default async function UploadDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { dup?: string; imported?: string };
}) {
  const supabase = createClient();
  const uploadId = Number(params.id);

  const { data: upload } = await supabase
    .from("r20_uploads")
    .select("*, reporting_periods(id, label, lock_state)")
    .eq("id", uploadId)
    .maybeSingle();
  if (!upload) notFound();
  const period = upload.reporting_periods as { id: number; label: string; lock_state: string } | null;

  const [{ data: rows }, { data: districts }, classification] = await Promise.all([
    supabase
      .from("r20_staging_rows")
      .select("id, sheet_name, row_number, employee_no_raw, employee_name_raw, district_raw, validation_status, validation_message")
      .eq("upload_id", uploadId),
    supabase.from("districts").select("id, district_name, zones(zone_name)").order("district_name"),
    classifyUpload(uploadId),
  ]);

  const all = rows ?? [];
  const unmappedMap = new Map<string, number>();
  for (const r of all) {
    if ((r.validation_message ?? "").includes("unmapped district")) {
      const key = r.district_raw ?? "(blank)";
      unmappedMap.set(key, (unmappedMap.get(key) ?? 0) + 1);
    }
  }
  const unmapped = [...unmappedMap.entries()].sort((a, b) => b[1] - a[1]);
  const problemRows = all
    .filter((r) => r.validation_status !== "valid")
    .slice(0, 100);

  const notes = (() => {
    try {
      return JSON.parse(upload.processing_notes ?? "{}");
    } catch {
      return {};
    }
  })();

  return (
    <>
      <PageHeader
        title={upload.original_filename}
        sub={`${period?.label ?? ""} - status: ${String(upload.status).replace("_", " ")}`}
      />

      {searchParams.imported && (
        <div className="mb-5 border-l-4 border-grow bg-grow-wash rounded px-4 py-3 text-sm">
          Imported. This month is now part of the membership history and appears in the analytics.
        </div>
      )}

      {searchParams.dup && (
        <div className="mb-5 border-l-4 border-stable bg-stable-wash rounded px-4 py-3 text-sm">
          This exact file was already uploaded (
          <Link href={`/r20/queue/${searchParams.dup}`} className="underline">
            upload #{searchParams.dup}
          </Link>
          ). Check you are not importing the same R20 twice.
        </div>
      )}

      {(() => {
        const q = upload.total_rows > 0 ? (upload.valid_rows / upload.total_rows) * 100 : 100;
        const tone = q >= 99 ? "text-grow" : q >= 95 ? "text-stable" : "text-decline";
        return (
          <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-3xl font-extrabold tabular-nums">{q.toFixed(1)}%</span>
            <span className={`font-mono text-xs uppercase tracking-wide ${tone}`}>data quality</span>
            <span className="font-mono text-xs text-ink-3">
              {upload.valid_rows} of {upload.total_rows} rows clean
            </span>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatTile value={upload.total_rows} label="source rows" />
        <StatTile value={upload.valid_rows} label="valid members" />
        <StatTile value={upload.blank_rows} label="blank rows ignored" />
        <StatTile value={upload.duplicate_rows} label="duplicate emp. nos" />
        <StatTile value={notes.missingEmployeeNo ?? 0} label="missing emp. nos" />
        <StatTile value={upload.unmapped_rows} label="unmapped districts" />
      </div>

      {unmapped.length > 0 && (
        <Card className="mb-6">
          <h3 className="font-display text-sm uppercase tracking-tight mb-1">Unmapped districts</h3>
          <p className="text-sm text-ink-2 mb-4">
            These <code className="font-mono">DISTRICT</code> values are not recognised. Assign each one to a
            district; the choice is saved as an alias so future R20s map it automatically.
          </p>
          <div className="flex flex-col gap-2">
            {unmapped.map(([raw, count]) => (
              <form
                key={raw}
                action={resolveUnmapped}
                className="flex flex-wrap items-center gap-3 border border-border rounded px-3 py-2"
              >
                <input type="hidden" name="upload_id" value={uploadId} />
                <input type="hidden" name="district_raw" value={raw} />
                <span className="font-mono text-sm grow">
                  {raw} <span className="text-ink-3">({count} row{count === 1 ? "" : "s"})</span>
                </span>
                <select
                  name="district_id"
                  required
                  className="border border-border-strong rounded bg-ground px-2 py-1 text-sm outline-none focus:border-primary"
                >
                  <option value="">Choose district...</option>
                  {districts?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name} ({(d.zones as { zone_name?: string } | null)?.zone_name})
                    </option>
                  ))}
                </select>
                <SubmitButton variant="ghost">Map</SubmitButton>
              </form>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
          <h3 className="font-display text-sm uppercase tracking-tight">
            Zone &amp; district classification
          </h3>
          <span className="font-mono text-xs text-ink-3">
            {classification.classified.toLocaleString()} sorted
            {classification.unclassified > 0 && (
              <span className="text-decline"> &middot; {classification.unclassified} not yet placed</span>
            )}
          </span>
        </div>
        <p className="text-sm text-ink-2 mb-4">
          Every member has been sorted into a zone and district automatically from the{" "}
          <code className="font-mono">DISTRICT</code> column. Expand a zone to see its districts.
        </p>
        <div className="flex flex-col gap-1">
          {classification.zones.map((z) => {
            const maxCount = classification.zones[0]?.count || 1;
            return (
              <details key={z.zoneId} className="border border-border rounded bg-ground">
                <summary className="flex items-center gap-3 px-3 py-2 cursor-pointer select-none">
                  <span className="font-medium grow">{z.zoneName}</span>
                  <span
                    className="h-1.5 rounded-full bg-primary/70"
                    style={{ width: `${Math.max(6, (z.count / maxCount) * 120)}px` }}
                    aria-hidden
                  />
                  <span className="font-mono text-sm tabular-nums w-14 text-right">{z.count}</span>
                </summary>
                <div className="px-3 pb-2 pt-1 border-t border-border">
                  <table className="w-full text-sm font-mono">
                    <tbody>
                      {z.districts.map((d) => (
                        <tr key={d.districtId}>
                          <td className="py-0.5 text-ink-2">{d.districtName}</td>
                          <td className="py-0.5 text-right tabular-nums text-ink-3">{d.count}</td>
                        </tr>
                      ))}
                      {z.districts.length === 0 && (
                        <tr>
                          <td className="py-0.5 text-ink-3">no districts resolved</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
        <p className="text-[11px] font-mono text-ink-3 mt-3">
          On approval this classification becomes each member&apos;s monthly snapshot and drives the
          zone / district analytics and the per-zone R20 exports.
        </p>
      </Card>

      <Card className="mb-6">
        <h3 className="font-display text-sm uppercase tracking-tight mb-2">Sheets</h3>
        <p className="text-sm text-ink-2">
          <span className="font-mono text-ink-3">read:</span>{" "}
          {(notes.sheetsRead ?? []).join(", ") || "-"}
        </p>
        {notes.sheetsSkipped?.length > 0 && (
          <p className="text-sm text-ink-2 mt-1">
            <span className="font-mono text-ink-3">skipped (not R20):</span>{" "}
            {notes.sheetsSkipped.join(", ")}
          </p>
        )}
      </Card>

      {problemRows.length > 0 && (
        <div>
          <h3 className="font-display text-sm uppercase tracking-tight mb-2">
            Rows needing attention ({all.length - upload.valid_rows} total, showing {problemRows.length})
          </h3>
          <div className="overflow-x-auto border border-border rounded">
            <table className="w-full text-sm min-w-[640px] font-mono">
              <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3 py-2">Sheet</th>
                  <th className="text-right px-3 py-2">Row</th>
                  <th className="text-left px-3 py-2">Employee</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Problem</th>
                </tr>
              </thead>
              <tbody>
                {problemRows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-1.5">{r.sheet_name}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{r.row_number}</td>
                    <td className="px-3 py-1.5">{r.employee_no_raw ?? "-"}</td>
                    <td className="px-3 py-1.5">{r.employee_name_raw ?? "-"}</td>
                    <td className="px-3 py-1.5 text-decline">{r.validation_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(() => {
        const missing = notes.missingEmployeeNo ?? 0;
        const importable = all.length - upload.unmapped_rows - missing;
        const excluded = upload.unmapped_rows + missing;
        const alreadyImported = upload.status === "imported" || upload.status === "archived";
        const locked = period?.lock_state === "locked";

        return (
          <div className="mt-8 border-t border-border pt-5">
            {alreadyImported ? (
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-sm uppercase tracking-tight mb-1">Imported</h3>
                    <p className="text-sm text-ink-2">
                      {period?.label} is in the membership history.{" "}
                      {locked ? "The period is locked." : "The period is open and can still be re-imported."}
                    </p>
                  </div>
                  {period && (
                    <form action={setPeriodLock}>
                      <input type="hidden" name="period_id" value={period.id} />
                      <input type="hidden" name="upload_id" value={uploadId} />
                      <input type="hidden" name="lock" value={String(!locked)} />
                      <SubmitButton variant="ghost">{locked ? "Unlock period" : "Lock period"}</SubmitButton>
                    </form>
                  )}
                </div>
              </Card>
            ) : (
              <Card>
                <h3 className="font-display text-sm uppercase tracking-tight mb-1">Approve &amp; import</h3>
                <p className="text-sm text-ink-2 mb-3">
                  Writes an immutable monthly snapshot for <strong>{importable.toLocaleString()}</strong> members
                  {excluded > 0 && (
                    <>
                      {" "}and excludes <strong>{excluded}</strong>{" "}
                      {excluded === 1 ? "row" : "rows"} that are still unmapped or missing an employee number
                    </>
                  )}
                  . This cannot be undone without unlocking and re-importing.
                </p>
                <form action={approveUpload}>
                  <input type="hidden" name="upload_id" value={uploadId} />
                  <SubmitButton>Approve &amp; import {period?.label}</SubmitButton>
                </form>
              </Card>
            )}
          </div>
        );
      })()}
    </>
  );
}
