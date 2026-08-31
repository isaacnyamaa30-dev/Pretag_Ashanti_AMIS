import Link from "next/link";
import type { CompareRow } from "@/lib/analytics";
import { statusClasses } from "@/lib/analytics";

function pct(v: number | null) {
  return v === null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function CompareTable({
  rows,
  showTransfers = true,
  linkZones = false,
}: {
  rows: CompareRow[];
  showTransfers?: boolean;
  linkZones?: boolean;
}) {
  return (
    <div className="overflow-x-auto border border-border rounded">
      <table className="w-full text-sm min-w-[720px] font-mono">
        <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
          <tr>
            <th className="text-left px-3 py-2">Area</th>
            <th className="text-right px-3 py-2">Prev</th>
            <th className="text-right px-3 py-2">Curr</th>
            <th className="text-right px-3 py-2">Added</th>
            <th className="text-right px-3 py-2">Missing</th>
            {showTransfers && <th className="text-right px-3 py-2">In</th>}
            {showTransfers && <th className="text-right px-3 py-2">Out</th>}
            <th className="text-right px-3 py-2">Net</th>
            <th className="text-right px-3 py-2">Growth</th>
            <th className="text-left px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.level}-${r.zone_id ?? "region"}`}
              className={`border-t border-border ${r.level === "region" ? "bg-surface-2 font-semibold" : "hover:bg-surface-2"}`}
            >
              <td className="px-3 py-2">
                {linkZones && r.level === "zone" ? (
                  <Link href={`/analytics/zones?zone=${r.zone_id}`} className="underline">
                    {r.name}
                  </Link>
                ) : (
                  r.name
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{r.previous.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.current.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-grow">+{r.added}</td>
              <td className="px-3 py-2 text-right tabular-nums text-decline">-{r.missing}</td>
              {showTransfers && (
                <td className="px-3 py-2 text-right tabular-nums text-ink-3">{r.transfers_in || "-"}</td>
              )}
              {showTransfers && (
                <td className="px-3 py-2 text-right tabular-nums text-ink-3">{r.transfers_out || "-"}</td>
              )}
              <td
                className={`px-3 py-2 text-right tabular-nums ${
                  r.net > 0 ? "text-grow" : r.net < 0 ? "text-decline" : ""
                }`}
              >
                {r.net > 0 ? "+" : ""}
                {r.net}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{pct(r.growth_pct)}</td>
              <td className="px-3 py-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusClasses(r.status)}`}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
