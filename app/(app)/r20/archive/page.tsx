import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "R20 Archive - PRETAG AMIS" };

const BUCKET = process.env.R20_STORAGE_BUCKET || "r20";

export default async function ArchivePage() {
  const supabase = createClient();
  const { data: uploads } = await supabase
    .from("r20_uploads")
    .select("id, original_filename, storage_path, status, uploaded_at, total_rows, valid_rows, unmapped_rows, duplicate_rows, reporting_periods(label)")
    .order("uploaded_at", { ascending: false });

  // signed URLs for the originals (1 hour)
  const signed = new Map<string, string>();
  for (const u of uploads ?? []) {
    if (!u.storage_path) continue;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(u.storage_path, 3600);
    if (data?.signedUrl) signed.set(u.storage_path, data.signedUrl);
  }

  return (
    <>
      <PageHeader
        title="R20 Archive"
        sub="Every original file ever uploaded, kept permanently, with its validation result."
      />
      {!uploads?.length ? (
        <p className="text-ink-3 font-mono text-sm">No uploads yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {uploads.map((u) => {
            const p = u.reporting_periods as { label?: string } | null;
            const url = u.storage_path ? signed.get(u.storage_path) : undefined;
            return (
              <div key={u.id} className="bg-surface border border-border rounded px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="font-mono">{u.original_filename}</span>{" "}
                    <span className="text-ink-3 text-sm">{p?.label}</span>
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-wide text-ink-3">
                    {u.status.replace("_", " ")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-xs font-mono text-ink-3">
                  <span>{u.total_rows} rows</span>
                  <span>{u.valid_rows} valid</span>
                  {(u.unmapped_rows ?? 0) > 0 && <span className="text-decline">{u.unmapped_rows} unmapped</span>}
                  {(u.duplicate_rows ?? 0) > 0 && <span className="text-decline">{u.duplicate_rows} duplicates</span>}
                  <span>{new Date(u.uploaded_at).toLocaleString("en-GB")}</span>
                  <Link href={`/r20/queue/${u.id}`} className="underline text-ink-2">details</Link>
                  {url && (
                    <a href={url} className="underline text-primary">download original</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
