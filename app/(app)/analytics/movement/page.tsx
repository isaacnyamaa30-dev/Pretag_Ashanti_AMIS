import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { getImportedPeriods, getMovers } from "@/lib/analytics";
import { getSessionUser, isStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReasonSelect } from "@/components/ReasonSelect";

export const metadata = { title: "Membership Movement - PRETAG AMIS" };

const KINDS = [
  { key: "added", label: "Added to R20", tone: "text-grow" },
  { key: "missing", label: "No longer in R20", tone: "text-decline" },
  { key: "transfer", label: "Moved zone / district", tone: "text-ink-2" },
] as const;

export default async function MovementPage({
  searchParams,
}: {
  searchParams: { kind?: string; from?: string; to?: string };
}) {
  const periods = await getImportedPeriods();
  if (periods.length < 2) {
    return (
      <>
        <PageHeader title="Membership Movement" />
        <p className="text-ink-3 font-mono text-sm">Needs two imported R20s.</p>
      </>
    );
  }

  const toId = Number(searchParams.to) || periods[0].id;
  const fromId = Number(searchParams.from) || periods[1].id;
  const from = periods.find((p) => p.id === fromId)!;
  const to = periods.find((p) => p.id === toId)!;
  const kind = (["added", "missing", "transfer"].includes(searchParams.kind ?? "")
    ? searchParams.kind
    : "missing") as "added" | "missing" | "transfer";

  const movers = await getMovers(fromId, toId, kind);
  const isTransfer = kind === "transfer";

  const session = await getSessionUser();
  const canEdit = isStaff(session?.profile?.role);
  const mvType = kind === "added" ? "added" : kind === "missing" ? "missing" : "internal";

  // existing reasons for the members shown
  const reasonBy = new Map<string, string>();
  if (canEdit && movers.length) {
    const supabase = createClient();
    const empNos = movers.slice(0, 500).map((m) => m.employee_no);
    const { data } = await supabase
      .from("membership_movement_reasons")
      .select("reason, members!inner(employee_no)")
      .eq("period_id", toId)
      .eq("movement_type", mvType)
      .in("members.employee_no", empNos);
    for (const r of data ?? []) {
      const en = (r.members as { employee_no?: string } | null)?.employee_no;
      if (en) reasonBy.set(en, r.reason as string);
    }
  }

  return (
    <>
      <PageHeader
        title="Membership Movement"
        sub={`${from.label} to ${to.label}`}
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {KINDS.map((k) => (
          <Link
            key={k.key}
            href={`/analytics/movement?kind=${k.key}&from=${fromId}&to=${toId}`}
            className={`text-sm font-mono px-3 py-1.5 rounded border ${
              kind === k.key ? "border-primary bg-brand-wash text-ink" : "border-border text-ink-2 hover:bg-surface-2"
            }`}
          >
            {k.label}
          </Link>
        ))}
      </div>

      <p className="text-sm text-ink-2 mb-3">
        <strong>{movers.length.toLocaleString()}</strong> members.{" "}
        {kind === "missing" && "In the previous R20 but not the current one - reason not yet verified."}
        {kind === "added" && "In the current R20 but not the previous one."}
        {kind === "transfer" && "Present in both, but their zone or district changed."}
      </p>

      {(kind === "missing" || kind === "added") && movers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <a
            href={`/api/exports?type=movers&kind=${kind}&from=${fromId}&to=${toId}`}
            className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2"
          >
            Download Excel
          </a>
          <Link
            href={`/reports/movement?kind=${kind}&from=${fromId}&to=${toId}`}
            className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2"
          >
            Print / Save as PDF
          </Link>
          <span className="font-mono text-xs text-ink-3">
            Full details for executive follow-up.
          </span>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono min-w-[720px]">
            <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2">Employee no</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Management unit</th>
                {isTransfer ? (
                  <>
                    <th className="text-left px-3 py-2">From</th>
                    <th className="text-left px-3 py-2">To</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-3 py-2">Zone</th>
                    <th className="text-left px-3 py-2">District</th>
                  </>
                )}
                {canEdit && <th className="text-left px-3 py-2">Reason</th>}
              </tr>
            </thead>
            <tbody>
              {movers.slice(0, 500).map((m) => (
                <tr key={m.employee_no} className="border-t border-border hover:bg-surface-2">
                  <td className="px-3 py-1.5">{m.employee_no}</td>
                  <td className="px-3 py-1.5">{m.name}</td>
                  <td className="px-3 py-1.5 text-ink-3">{m.management_unit}</td>
                  {isTransfer ? (
                    <>
                      <td className="px-3 py-1.5">
                        {m.from_zone}
                        {m.from_district !== m.to_district && (
                          <span className="text-ink-3"> / {m.from_district}</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {m.to_zone}
                        {m.from_district !== m.to_district && (
                          <span className="text-ink-3"> / {m.to_district}</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-1.5">{m.to_zone ?? m.from_zone}</td>
                      <td className="px-3 py-1.5 text-ink-3">{m.to_district ?? m.from_district}</td>
                    </>
                  )}
                  {canEdit && (
                    <td className="px-3 py-1">
                      <ReasonSelect
                        employeeNo={m.employee_no}
                        periodId={toId}
                        kind={kind}
                        current={reasonBy.get(m.employee_no) ?? null}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {movers.length > 500 && (
          <p className="text-xs font-mono text-ink-3 px-3 py-2 border-t border-border">
            Showing the first 500 of {movers.length.toLocaleString()}. The complete member-level list is
            in the Comparison report from the Export Centre.
          </p>
        )}
      </Card>
    </>
  );
}
