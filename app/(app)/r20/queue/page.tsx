import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Validation Queue - PRETAG AMIS" };

const STATUS_STYLE: Record<string, string> = {
  validating: "bg-stable-wash text-stable",
  needs_review: "bg-stable-wash text-stable",
  validated: "bg-grow-wash text-grow",
  approved: "bg-grow-wash text-grow",
  imported: "bg-grow-wash text-grow",
  failed: "bg-decline-wash text-decline",
  archived: "bg-surface-2 text-ink-3",
  uploaded: "bg-surface-2 text-ink-3",
};

export default async function QueuePage() {
  const supabase = createClient();
  const { data: uploads } = await supabase
    .from("r20_uploads")
    .select(
      "id, original_filename, status, uploaded_at, total_rows, valid_rows, unmapped_rows, duplicate_rows, reporting_periods(label)",
    )
    .order("uploaded_at", { ascending: false });

  return (
    <>
      <PageHeader title="Validation Queue" sub="Every R20 upload and where it is in the pipeline." />

      {!uploads?.length ? (
        <p className="text-ink-3 font-mono text-sm">
          No uploads yet. Start from <Link href="/r20/upload" className="underline">Upload R20</Link>.
        </p>
      ) : (
        <div className="overflow-x-auto border border-border rounded">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-primary text-on-primary font-mono text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2">File</th>
                <th className="text-left px-3 py-2">Period</th>
                <th className="text-right px-3 py-2">Rows</th>
                <th className="text-right px-3 py-2">Valid</th>
                <th className="text-right px-3 py-2">Unmapped</th>
                <th className="text-right px-3 py-2">Dupes</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-surface-2">
                  <td className="px-3 py-2">
                    <Link href={`/r20/queue/${u.id}`} className="font-mono underline">
                      {u.original_filename}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {(u.reporting_periods as { label?: string } | null)?.label ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{u.total_rows}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{u.valid_rows}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{u.unmapped_rows}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{u.duplicate_rows}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
                        STATUS_STYLE[u.status] ?? "bg-surface-2 text-ink-3"
                      }`}
                    >
                      {u.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
