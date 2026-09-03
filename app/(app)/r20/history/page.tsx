import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Import History - PRETAG AMIS" };

export default async function ImportHistoryPage() {
  const supabase = createClient();
  const { data: uploads } = await supabase
    .from("r20_uploads")
    .select("id, original_filename, approved_at, uploaded_at, total_rows, valid_rows, unmapped_rows, reporting_periods(label, lock_state)")
    .eq("status", "imported")
    .order("approved_at", { ascending: false });

  return (
    <>
      <PageHeader title="Import History" sub="Every R20 that has been approved into the membership history." />
      {!uploads?.length ? (
        <p className="text-ink-3 font-mono text-sm">Nothing imported yet.</p>
      ) : (
        <div className="overflow-x-auto border border-border rounded">
          <table className="w-full text-sm font-mono min-w-[640px]">
            <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2">Period</th>
                <th className="text-left px-3 py-2">File</th>
                <th className="text-right px-3 py-2">Members</th>
                <th className="text-right px-3 py-2">Excluded</th>
                <th className="text-left px-3 py-2">Imported</th>
                <th className="text-left px-3 py-2">Lock</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => {
                const p = u.reporting_periods as { label?: string; lock_state?: string } | null;
                return (
                  <tr key={u.id} className="border-t border-border hover:bg-surface-2">
                    <td className="px-3 py-2">{p?.label}</td>
                    <td className="px-3 py-2">
                      <Link href={`/r20/queue/${u.id}`} className="underline">{u.original_filename}</Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {(u.valid_rows ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-3">
                      {Math.max(0, (u.total_rows ?? 0) - (u.valid_rows ?? 0)).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-ink-3">
                      {u.approved_at ? new Date(u.approved_at).toLocaleDateString("en-GB") : "-"}
                    </td>
                    <td className="px-3 py-2">
                      {p?.lock_state === "locked" ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-stable-wash text-stable">locked</span>
                      ) : (
                        <span className="text-ink-3">open</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
