/**
 * Zone Performance Score (blueprint section 63). A weighted 0-100 index.
 * Weights are admin-configurable (settings key `scorecard_weights`); this is a
 * decision-support indicator, not an official ranking, until PRETAG signs off on
 * the weighting.
 */
import { createClient } from "@/lib/supabase/server";
import type { CompareRow } from "@/lib/analytics";

export type Weights = { growth: number; retention: number; acquisition: number; consistency: number };
export type ZoneScore = {
  zoneId: number;
  name: string;
  score: number;
  parts: { growth: number; retention: number; acquisition: number; consistency: number };
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export async function getWeights(): Promise<Weights> {
  const supabase = createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "scorecard_weights").maybeSingle();
  const v = (data?.value ?? {}) as Partial<Weights>;
  return {
    growth: v.growth ?? 0.35,
    retention: v.retention ?? 0.3,
    acquisition: v.acquisition ?? 0.2,
    consistency: v.consistency ?? 0.15,
  };
}

/** consistencyByZone: 0-100, higher = steadier month-on-month growth. */
export function scoreZones(
  rows: CompareRow[],
  weights: Weights,
  consistencyByZone: Map<number, number>,
): ZoneScore[] {
  const zones = rows.filter((r) => r.level === "zone" && r.zone_id != null);
  const wsum = weights.growth + weights.retention + weights.acquisition + weights.consistency || 1;

  return zones
    .map((z) => {
      const growth = clamp(50 + (z.growth_pct ?? 0) * 5); // -10% -> 0, +10% -> 100
      const retention = clamp(z.retention_pct ?? 100);
      const acqRate = z.previous > 0 ? (z.added / z.previous) * 100 : 0;
      const acquisition = clamp(acqRate * 6); // ~16.7% intake -> 100
      const consistency = clamp(consistencyByZone.get(z.zone_id!) ?? 50);

      const score =
        (growth * weights.growth +
          retention * weights.retention +
          acquisition * weights.acquisition +
          consistency * weights.consistency) /
        wsum;

      return {
        zoneId: z.zone_id!,
        name: z.name,
        score: Math.round(score * 10) / 10,
        parts: {
          growth: Math.round(growth),
          retention: Math.round(retention),
          acquisition: Math.round(acquisition),
          consistency: Math.round(consistency),
        },
      };
    })
    .sort((a, b) => b.score - a.score);
}
