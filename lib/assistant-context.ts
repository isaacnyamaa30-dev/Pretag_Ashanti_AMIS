/**
 * Builds a compact text snapshot of the APPROVED membership database for the AI
 * assistant. The assistant only ever sees this - never raw uploads - per
 * blueprint section 65.
 */
import { createClient } from "@/lib/supabase/server";
import {
  getImportedPeriods,
  comparePeriods,
  periodSummary,
  membershipSeries,
} from "@/lib/analytics";
import { executiveSummary } from "@/lib/summary";

export async function buildAssistantContext(): Promise<string> {
  const periods = await getImportedPeriods();
  if (periods.length === 0) return "No R20 has been imported yet. There is no membership data to analyse.";

  const supabase = createClient();
  const latest = periods[0];
  const previous = periods[1];

  const [summary, series] = await Promise.all([periodSummary(latest.id), membershipSeries()]);
  const lines: string[] = [];

  lines.push(`PRETAG Ashanti Region membership data. Imported months: ${periods.map((p) => p.label).join(", ")}.`);
  lines.push(`Latest month: ${latest.label}. Total members: ${summary.region}.`);
  lines.push("");
  lines.push("Members by zone (latest month):");
  for (const z of summary.zones) lines.push(`  ${z.name}: ${z.members}`);

  lines.push("");
  lines.push("Membership over time:");
  for (const s of series) lines.push(`  ${s.label}: ${s.members}`);

  if (previous) {
    const rows = await comparePeriods(previous.id, latest.id);
    const region = rows.find((r) => r.level === "region")!;
    lines.push("");
    lines.push(`Change ${previous.label} -> ${latest.label}: net ${region.net > 0 ? "+" : ""}${region.net} (${region.growth_pct ?? "n/a"}%), ${region.added} added, ${region.missing} missing, retention ${region.retention_pct ?? "n/a"}%.`);
    lines.push("Per zone (previous -> current, net, growth%, status):");
    for (const z of rows.filter((r) => r.level === "zone")) {
      lines.push(`  ${z.name}: ${z.previous} -> ${z.current}, net ${z.net > 0 ? "+" : ""}${z.net}, ${z.growth_pct ?? "n/a"}%, ${z.status}, transfers in ${z.transfers_in} out ${z.transfers_out}`);
    }
    lines.push("");
    lines.push("Executive summary: " + executiveSummary(rows, previous.label, latest.label));
  }

  // multi-month zone series if 3+
  if (series.length >= 3) {
    const { data: zs } = await supabase.rpc("zone_series");
    const byZone = new Map<string, string[]>();
    for (const r of (zs ?? []) as { zone_name: string; label: string; members: number }[]) {
      const list = byZone.get(r.zone_name) ?? [];
      list.push(`${r.label.split(" ")[0]}:${r.members}`);
      byZone.set(r.zone_name, list);
    }
    lines.push("");
    lines.push("Zone month-by-month:");
    for (const [name, vals] of byZone) lines.push(`  ${name}: ${vals.join(", ")}`);
  }

  return lines.join("\n");
}
