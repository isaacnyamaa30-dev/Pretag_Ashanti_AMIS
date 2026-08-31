import { createClient } from "@/lib/supabase/server";

export type Period = { id: number; label: string; month: number; year: number; lock_state: string };

export type CompareRow = {
  level: "region" | "zone";
  zone_id: number | null;
  name: string;
  previous: number;
  current: number;
  added: number;
  missing: number;
  transfers_in: number;
  transfers_out: number;
  net: number;
  growth_pct: number | null;
  retention_pct: number | null;
  status: "growing" | "stable" | "declining" | "new";
};

export type Bands = { growing_above: number; declining_below: number };

export async function getBands(): Promise<Bands> {
  const supabase = createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "performance_bands")
    .maybeSingle();
  const v = data?.value as Partial<Bands> | undefined;
  return { growing_above: v?.growing_above ?? 0.5, declining_below: v?.declining_below ?? -0.5 };
}

/** Imported periods, newest first. */
export async function getImportedPeriods(): Promise<Period[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("reporting_periods")
    .select("id, label, month, year, lock_state, r20_uploads!inner(status)")
    .eq("r20_uploads.status", "imported")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  // dedupe periods (one approved upload each, but be safe)
  const seen = new Set<number>();
  return (data ?? [])
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map(({ id, label, month, year, lock_state }) => ({ id, label, month, year, lock_state }));
}

function classify(previous: number, growthPct: number | null, bands: Bands): CompareRow["status"] {
  if (previous === 0) return "new";
  if (growthPct === null) return "stable";
  if (growthPct > bands.growing_above) return "growing";
  if (growthPct < bands.declining_below) return "declining";
  return "stable";
}

export async function comparePeriods(prevId: number, curId: number): Promise<CompareRow[]> {
  const supabase = createClient();
  const [{ data, error }, bands] = await Promise.all([
    supabase.rpc("compare_periods", { p_prev: prevId, p_cur: curId }),
    getBands(),
  ]);
  if (error) throw new Error(error.message);

  return ((data ?? []) as Omit<CompareRow, "net" | "growth_pct" | "retention_pct" | "status">[])
    .map((r) => {
      const previous = Number(r.previous);
      const current = Number(r.current);
      const net = current - previous;
      const growth_pct = previous === 0 ? null : Math.round((net / previous) * 10000) / 100;
      const retained = previous - Number(r.missing) - Number(r.transfers_out);
      const retention_pct = previous === 0 ? null : Math.round((retained / previous) * 10000) / 100;
      return {
        ...r,
        level: r.level as "region" | "zone",
        previous,
        current,
        added: Number(r.added),
        missing: Number(r.missing),
        transfers_in: Number(r.transfers_in),
        transfers_out: Number(r.transfers_out),
        net,
        growth_pct,
        retention_pct,
        status: classify(previous, growth_pct, bands),
      };
    })
    .sort((a, b) => {
      if (a.level !== b.level) return a.level === "region" ? -1 : 1;
      return b.net - a.net;
    });
}

/** Total members per imported period, oldest first - for the trend chart. */
export async function getMembershipTrend(): Promise<{ label: string; members: number }[]> {
  const supabase = createClient();
  const periods = await getImportedPeriods();
  const ordered = [...periods].reverse();
  const out: { label: string; members: number }[] = [];
  for (const p of ordered) {
    const { count } = await supabase
      .from("membership_snapshots")
      .select("*", { count: "exact", head: true })
      .eq("period_id", p.id);
    out.push({ label: p.label, members: count ?? 0 });
  }
  return out;
}

export async function periodSummary(periodId: number) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("period_summary", { p_period: periodId });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { level: string; zone_id: number | null; name: string; members: number }[];
  return {
    region: Number(rows.find((r) => r.level === "region")?.members ?? 0),
    zones: rows
      .filter((r) => r.level === "zone")
      .map((r) => ({ zoneId: r.zone_id!, name: r.name, members: Number(r.members) }))
      .sort((a, b) => b.members - a.members),
  };
}

export type DistrictCompareRow = {
  district_id: number;
  name: string;
  zone_name: string;
  previous: number;
  current: number;
  added: number;
  missing: number;
  transfers_in: number;
  transfers_out: number;
  net: number;
  growth_pct: number | null;
};

export async function compareDistricts(prevId: number, curId: number): Promise<DistrictCompareRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("compare_districts", { p_prev: prevId, p_cur: curId });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, string>[]).map((r) => {
    const previous = Number(r.previous);
    const current = Number(r.current);
    const net = current - previous;
    return {
      district_id: Number(r.district_id),
      name: r.name,
      zone_name: r.zone_name,
      previous,
      current,
      added: Number(r.added),
      missing: Number(r.missing),
      transfers_in: Number(r.transfers_in),
      transfers_out: Number(r.transfers_out),
      net,
      growth_pct: previous === 0 ? null : Math.round((net / previous) * 10000) / 100,
    };
  });
}

export async function membershipSeries(zoneId?: number) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("membership_series", { p_zone: zoneId ?? null });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, number | string>[]).map((r) => ({
    periodId: Number(r.period_id),
    label: String(r.label),
    members: Number(r.members),
  }));
}

export type Mover = {
  employee_no: string;
  name: string;
  management_unit: string;
  from_zone: string | null;
  to_zone: string | null;
  from_district: string | null;
  to_district: string | null;
};

export async function getMovers(
  prevId: number,
  curId: number,
  kind: "added" | "missing" | "transfer",
): Promise<Mover[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("period_movers", {
    p_prev: prevId,
    p_cur: curId,
    p_kind: kind,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Mover[];
}

export function statusClasses(status: CompareRow["status"]) {
  return (
    {
      growing: "bg-grow-wash text-grow",
      declining: "bg-decline-wash text-decline",
      stable: "bg-stable-wash text-stable",
      new: "bg-surface-2 text-ink-3",
    } as const
  )[status];
}
