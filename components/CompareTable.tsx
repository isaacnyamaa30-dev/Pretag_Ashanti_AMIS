import Link from "next/link";
import type { CompareRow } from "@/lib/analytics";
import { statusClasses } from "@/lib/analytics";

function pct(v: number | null) {
  return v === null ? "n/a" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

const HELP = {
  prev: "Members in the previous month's R20 for this area",
  curr: "Members in the current month's R20 for this area",
  added: "New: in the current R20 but were not in the previous R20 anywhere in the region",
  missing: "Gone: were in the previous R20 for this area but are not in the current R20 anywhere",
  in: "Transferred in: were in the region last month in a different zone/district, now here",
  out: "Transferred out: were here last month, still in the region but now in a different zone/district",
  net: "Change in the count: Current minus Previous  =  Added + In  -  Missing - Out",
  growth: "Net change as a percentage of the previous count",
};

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
    <div>
      <div className="overflow-x-auto border border-border rounded">
        <table className="w-full text-sm min-w-[720px] font-mono">
          <thead className="head-3d bg-primary text-on-primary text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2.5">Area</th>
              <th className="text-right px-3 py-2.5" title={HELP.prev}>Prev</th>
              <th className="text-right px-3 py-2.5" title={HELP.curr}>Curr</th>
              <th className="text-right px-3 py-2.5" title={HELP.added}>Added</th>
              <th className="text-right px-3 py-2.5" title={HELP.missing}>Missing</th>
              {showTransfers && <th className="text-right px-3 py-2.5" title={HELP.in}>In</th>}
              {showTransfers && <th className="text-right px-3 py-2.5" title={HELP.out}>Out</th>}
              <th className="text-right px-3 py-2.5" title={HELP.net}>Net</th>
              <th className="text-right px-3 py-2.5" title={HELP.growth}>Growth</th>
              <th className="text-left px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.level}-${r.zone_id ?? "region"}`}
                className={`border-t border-border ${r.level === "region" ? "bg-surface-2 font-bold" : "hover:bg-surface-2"}`}
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
                <td className="px-3 py-2 text-right tabular-nums text-decline">&minus;{r.missing}</td>
                {showTransfers && (
                  <td className="px-3 py-2 text-right tabular-nums text-grow">
                    {r.transfers_in ? `+${r.transfers_in}` : "-"}
                  </td>
                )}
                {showTransfers && (
                  <td className="px-3 py-2 text-right tabular-nums text-decline">
                    {r.transfers_out ? `−${r.transfers_out}` : "-"}
                  </td>
                )}
                <td
                  className={`px-3 py-2 text-right tabular-nums font-bold ${
                    r.net > 0 ? "text-grow" : r.net < 0 ? "text-decline" : ""
                  }`}
                >
                  {r.net > 0 ? "+" : r.net < 0 ? "−" : ""}
                  {Math.abs(r.net)}
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

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="inline font-bold text-grow">Added</dt> <dd className="inline text-ink-2">= new to the R20 this month</dd></div>
        <div><dt className="inline font-bold text-decline">Missing</dt> <dd className="inline text-ink-2">= dropped out of the R20 this month</dd></div>
        {showTransfers && (
          <div><dt className="inline font-bold">In / Out</dt> <dd className="inline text-ink-2">= moved between zones/districts (still in the region)</dd></div>
        )}
        <div className="sm:col-span-2 lg:col-span-3">
          <dt className="inline font-bold">Net</dt>{" "}
          <dd className="inline text-ink-2">
            = Current &minus; Previous = <span className="text-grow">Added</span> +{" "}
            {showTransfers && <><span className="text-grow">In</span> &minus; </>}
            <span className="text-decline">Missing</span>
            {showTransfers && <> &minus; <span className="text-decline">Out</span></>}. So a zone can
            have a positive <span className="text-grow">Added</span> and still a negative{" "}
            <span className="text-decline">Net</span> if more members left than joined.
          </dd>
        </div>
      </dl>
    </div>
  );
}
