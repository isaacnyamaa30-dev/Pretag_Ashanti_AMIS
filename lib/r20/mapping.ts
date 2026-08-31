/**
 * District -> zone resolver. TypeScript port of analyzer/mapping.py.
 * Built from the `district_aliases` + `districts` tables.
 */
import { normKey, stripNoise } from "./normalize";

export type ResolvedDistrict = {
  districtId: number;
  districtName: string;
  zoneId: number;
  zoneName: string;
};

export type AliasRow = { normalized_alias: string; district_id: number };
export type DistrictRow = {
  id: number;
  district_name: string;
  zone_id: number;
  zones: { zone_name: string } | { zone_name: string }[] | null;
};

function zoneNameOf(d: DistrictRow): string {
  const z = Array.isArray(d.zones) ? d.zones[0] : d.zones;
  return z?.zone_name ?? "";
}

export class Resolver {
  private byDistrict = new Map<number, ResolvedDistrict>();
  private exact = new Map<string, number>(); // normalized_alias -> district_id
  private loose = new Map<string, number>(); // stripNoise(key) -> district_id

  constructor(aliases: AliasRow[], districts: DistrictRow[]) {
    for (const d of districts) {
      this.byDistrict.set(d.id, {
        districtId: d.id,
        districtName: d.district_name,
        zoneId: d.zone_id,
        zoneName: zoneNameOf(d),
      });
      this.exact.set(normKey(d.district_name), d.id);
    }
    for (const a of aliases) this.exact.set(a.normalized_alias, a.district_id);
    for (const [key, id] of this.exact) {
      const loose = stripNoise(key);
      if (!this.loose.has(loose)) this.loose.set(loose, id);
    }
  }

  resolve(raw: string): ResolvedDistrict | null {
    const key = normKey(raw);
    if (!key) return null;
    const id = this.exact.get(key) ?? this.loose.get(stripNoise(key));
    return id != null ? (this.byDistrict.get(id) ?? null) : null;
  }
}
