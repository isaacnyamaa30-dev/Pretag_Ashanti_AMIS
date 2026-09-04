import { PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";
import { getImportedPeriods, getMovers } from "@/lib/analytics";

export const metadata = { title: "Members Who Left / Joined - PRETAG AMIS" };

type Kind = "missing" | "added";

export default async function MovementReportPage({
  searchParams,
}: {
  searchParams: { kind?: string; from?: string; to?: string };
}) {
  const periods = await getImportedPeriods();

  if (periods.length < 2) {
    return (
      <>
        <PageHeader title="Members Who Left / Joined the R20" />
        <p className="text-ink-3 font-mono text-sm">
          This report compares two months. {periods.length} R20{periods.length === 1 ? " has" : "s have"}{" "}
          been imported so far.
        </p>
      </>
    );
  }

  const kind: Kind = searchParams.kind === "added" ? "added" : "missing";
  const toId = Number(searchParams.to) || periods[0].id;
  const fromId = Number(searchParams.from) || periods[1].id;
  const from = periods.find((p) => p.id === fromId) ?? periods[1];
  const to = periods.find((p) => p.id === toId) ?? periods[0];

  const leavers = kind === "missing";
  const rows = fromId === toId ? [] : await getMovers(fromId, toId, kind);

  const zoneOf = (r: (typeof rows)[number]) => (leavers ? r.from_zone : r.to_zone) ?? "Unassigned";
  const districtOf = (r: (typeof rows)[number]) =>
    (leavers ? r.from_district : r.to_district) ?? "Unassigned";
  const sorted = [...rows].sort(
    (a, b) =>
      zoneOf(a).localeCompare(zoneOf(b)) ||
      districtOf(a).localeCompare(districtOf(b)) ||
      (a.name ?? "").localeCompare(b.name ?? ""),
  );

  const exportHref = (format: "xlsx" | "docx") =>
    `/api/exports?type=movers&kind=${kind}&from=${fromId}&to=${toId}&format=${format}`;
  const otherKind: Kind = leavers ? "added" : "missing";

  return (
    <div className="print-report">
      <div className="no-print mb-5 flex flex-col gap-3">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">List</span>
            <select
              name="kind"
              defaultValue={kind}
              className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm"
            >
              <option value="missing">Members who left the R20</option>
              <option value="added">New members in the R20</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Previous month</span>
            <select
              name="from"
              defaultValue={fromId}
              className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-ink-2">Current month</span>
            <select
              name="to"
              defaultValue={toId}
              className="border border-border-strong rounded bg-ground px-2.5 py-1.5 text-sm"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <button className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-1.5">Show</button>
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <PrintButton />
          <a href={exportHref("xlsx")} className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2">
            Download Excel
          </a>
          <a href={exportHref("docx")} className="font-mono text-xs uppercase tracking-wide btn-3d px-3 py-2">
            Download Word
          </a>
          <a
            href={`/reports/movement?kind=${otherKind}&from=${fromId}&to=${toId}`}
            className="font-mono text-xs underline text-ink-2 hover:text-primary"
          >
            {leavers ? "Switch to new members" : "Switch to members who left"}
          </a>
        </div>
      </div>

      <header className="mb-5 pb-4 border-b-2 border-primary">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          Pre-Tertiary Teachers Association of Ghana &mdash; Ashanti Region
        </p>
        <h1 className="font-display text-2xl uppercase tracking-tight mt-1">
          {leavers ? "Members No Longer in the R20" : "New Members in the R20"}
        </h1>
        <p className="text-sm text-ink-2 font-mono mt-1">
          {leavers
            ? `In the ${from.label} Regional R20 but not in the ${to.label} Regional R20.`
            : `In the ${to.label} Regional R20 but not in the ${from.label} Regional R20.`}
        </p>
        <p className="text-sm text-ink-3 font-mono mt-1">
          {sorted.length.toLocaleString()} member{sorted.length === 1 ? "" : "s"} &middot; generated{" "}
          {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </header>

      {fromId === toId ? (
        <p className="text-ink-3 font-mono text-sm">Choose two different months.</p>
      ) : sorted.length === 0 ? (
        <p className="text-ink-3 font-mono text-sm">
          No members {leavers ? "left" : "joined"} the R20 between these two months.
        </p>
      ) : (
        <div className="overflow-x-auto border border-border rounded">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-2 text-left">
                <th className="px-2 py-1 w-8">#</th>
                <th className="px-2 py-1">Employee no</th>
                <th className="px-2 py-1">Full name</th>
                <th className="px-2 py-1">Management unit</th>
                <th className="px-2 py-1">District</th>
                <th className="px-2 py-1">Zone</th>
                <th className="px-2 py-1">{leavers ? `Last in R20` : `First in R20`}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {sorted.map((r, i) => (
                <tr key={r.employee_no} className="border-t border-border">
                  <td className="px-2 py-1 text-ink-3 tabular-nums">{i + 1}</td>
                  <td className="px-2 py-1 tabular-nums">{r.employee_no}</td>
                  <td className="px-2 py-1">{r.name}</td>
                  <td className="px-2 py-1 text-ink-2">{r.management_unit}</td>
                  <td className="px-2 py-1">{districtOf(r)}</td>
                  <td className="px-2 py-1">{zoneOf(r)}</td>
                  <td className="px-2 py-1 text-ink-3">{leavers ? from.label : to.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="mt-8 pt-3 border-t border-border text-[10px] font-mono text-ink-3">
        PRETAG Ashanti Membership Intelligence System &middot; Developed by Saris IT Solution &middot;
        &copy; {new Date().getFullYear()} &middot; Enquiries: sarisitsolution@gmail.com / +233 24 117 6269 &middot;
        This list shows appearances in the R20 return, not verified reasons &mdash; for executive follow-up
        and confirmation.
      </footer>
    </div>
  );
}
