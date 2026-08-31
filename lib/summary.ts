/**
 * Deterministic executive-summary generator (blueprint section 42).
 * Plain-language paragraph from the comparison numbers - no AI, no external call.
 */
import type { CompareRow } from "@/lib/analytics";

const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty"];
const word = (n: number) => (n <= 20 ? NUM[n] : String(n));

export function executiveSummary(
  rows: CompareRow[],
  fromLabel: string,
  toLabel: string,
): string {
  const region = rows.find((r) => r.level === "region");
  if (!region) return "";
  const zones = rows.filter((r) => r.level === "zone");
  const growing = zones.filter((z) => z.status === "growing");
  const stable = zones.filter((z) => z.status === "stable");
  const declining = zones.filter((z) => z.status === "declining");

  const dir =
    region.net > 0 ? "a net increase of" : region.net < 0 ? "a net decrease of" : "no net change, with";
  const gpct =
    region.growth_pct === null
      ? ""
      : `, representing ${region.growth_pct > 0 ? "growth" : region.growth_pct < 0 ? "a decline" : "a change"} of ${Math.abs(region.growth_pct).toFixed(2)} per cent`;

  const topGain = [...zones].sort((a, b) => b.net - a.net)[0];
  const topLoss = [...zones].sort((a, b) => a.net - b.net)[0];
  const worstPct = [...zones]
    .filter((z) => z.growth_pct !== null)
    .sort((a, b) => (a.growth_pct ?? 0) - (b.growth_pct ?? 0))[0];

  const parts: string[] = [];

  parts.push(
    `Between ${fromLabel} and ${toLabel}, PRETAG Ashanti Region recorded ${dir} ${Math.abs(region.net)} member${Math.abs(region.net) === 1 ? "" : "s"}. ` +
      `Membership moved from ${region.previous.toLocaleString()} to ${region.current.toLocaleString()}${gpct}. ` +
      `${region.added} member${region.added === 1 ? "" : "s"} appeared in the ${toLabel} R20 that were not in the previous one, and ${region.missing} member${region.missing === 1 ? "" : "s"} present in ${fromLabel} did not appear${region.retention_pct !== null ? `, a retention rate of ${region.retention_pct.toFixed(1)} per cent` : ""}.`,
  );

  parts.push(
    `Of the eighteen zones, ${word(growing.length)} recorded positive growth, ${word(stable.length)} ${stable.length === 1 ? "remained" : "remained"} relatively stable and ${word(declining.length)} recorded ${declining.length === 1 ? "a decline" : "declines"}.`,
  );

  if (topGain && topGain.net > 0) {
    parts.push(
      `${topGain.name} recorded the largest numerical increase (${topGain.net > 0 ? "+" : ""}${topGain.net})` +
        (worstPct && worstPct.growth_pct !== null && worstPct.growth_pct < 0
          ? `, while ${worstPct.name} recorded the sharpest percentage decline (${worstPct.growth_pct.toFixed(2)} per cent).`
          : "."),
    );
  } else if (topLoss && topLoss.net < 0) {
    parts.push(`${topLoss.name} recorded the largest numerical decrease (${topLoss.net}).`);
  }

  if (declining.length > 0) {
    parts.push(
      `Regional attention may be required in the ${declining.length === 1 ? "declining zone" : `${word(declining.length)} declining zones`}: ${declining.map((z) => z.name).join(", ")}.`,
    );
  }

  return parts.join(" ");
}
