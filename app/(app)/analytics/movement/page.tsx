import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { getImportedPeriods, getMovers } from "@/lib/analytics";

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {movers.length > 500 && (
          <p className="text-xs font-mono text-ink-3 px-3 py-2 border-t border-border">
            Showing the first 500 of {movers.length}. Full list in the exports (coming in the next phase).
          </p>
        )}
      </Card>
    </>
  );
}
