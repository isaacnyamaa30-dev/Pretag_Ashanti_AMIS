/**
 * Zone / district classification of a staged R20 upload.
 *
 * Every staged row already carries its resolved `mapped_zone_id` and
 * `mapped_district_id` (assigned by the importer's alias engine). This turns
 * those into the zone -> districts -> count tree the validation screen shows,
 * so an executive can see exactly how the month's R20 sorted itself into the
 * 18 zones the moment it is uploaded.
 */
import { createClient } from "@/lib/supabase/server";

export type DistrictTally = { districtId: number; districtName: string; count: number };
export type ZoneTally = {
  zoneId: number;
  zoneName: string;
  count: number;
  districts: DistrictTally[];
};
export type Classification = {
  zones: ZoneTally[];
  classified: number;
  unclassified: number;
};

export async function classifyUpload(uploadId: number): Promise<Classification> {
  const supabase = createClient();

  const [{ data: zones }, { data: districts }] = await Promise.all([
    supabase.from("zones").select("id, zone_name").order("zone_name"),
    supabase.from("districts").select("id, district_name, zone_id"),
  ]);

  // A monthly R20 has thousands of rows; PostgREST caps a plain select at 1000,
  // so page through every staging row or the zone counts come out far too low.
  const rows: { mapped_zone_id: number | null; mapped_district_id: number | null }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("r20_staging_rows")
      .select("mapped_zone_id, mapped_district_id")
      .eq("upload_id", uploadId)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const zoneName = new Map((zones ?? []).map((z) => [z.id, z.zone_name]));
  const districtName = new Map((districts ?? []).map((d) => [d.id, d.district_name]));
  const districtZone = new Map((districts ?? []).map((d) => [d.id, d.zone_id]));

  const zoneCounts = new Map<number, number>();
  const districtCounts = new Map<number, number>();
  let unclassified = 0;

  for (const r of rows) {
    if (r.mapped_zone_id == null) {
      unclassified += 1;
      continue;
    }
    zoneCounts.set(r.mapped_zone_id, (zoneCounts.get(r.mapped_zone_id) ?? 0) + 1);
    if (r.mapped_district_id != null) {
      districtCounts.set(
        r.mapped_district_id,
        (districtCounts.get(r.mapped_district_id) ?? 0) + 1,
      );
    }
  }

  const zonesOut: ZoneTally[] = [...zoneCounts.entries()]
    .map(([zoneId, count]) => ({
      zoneId,
      zoneName: zoneName.get(zoneId) ?? `Zone ${zoneId}`,
      count,
      districts: [...districtCounts.entries()]
        .filter(([dId]) => districtZone.get(dId) === zoneId)
        .map(([dId, dCount]) => ({
          districtId: dId,
          districtName: districtName.get(dId) ?? `District ${dId}`,
          count: dCount,
        }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    zones: zonesOut,
    classified: [...zoneCounts.values()].reduce((a, b) => a + b, 0),
    unclassified,
  };
}
