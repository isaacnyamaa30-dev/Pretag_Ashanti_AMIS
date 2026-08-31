/**
 * Seed loader.  Reads ../../seed/*.json and upserts reference data into Supabase
 * using the service-role key (bypasses RLS).  Idempotent - safe to re-run.
 *
 *   cp .env.example .env.local   # fill in SUPABASE_SERVICE_ROLE_KEY
 *   npm run db:seed
 *
 * Run the migrations in database/migrations first.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const seedDir = resolve(process.cwd(), "seed");
const read = (f: string) => JSON.parse(readFileSync(resolve(seedDir, f), "utf8"));

const ROLES = [
  ["Super Administrator", "Full control of the entire system."],
  ["Regional Administrator", "Upload, import, edit mappings, manage users, all analytics and reports."],
  ["Regional Executive", "View regional / zone / district analytics; generate permitted reports."],
  ["Regional Data Officer", "Upload, validate, resolve errors, import approved files, generate exports."],
  ["Zone Executive", "View own zone, its districts and permitted member records only."],
  ["District Executive", "View own district only."],
  ["Viewer", "Read-only access."],
];

async function main() {
  // region
  await db.from("regions").upsert(
    { region_name: "Ashanti", region_code: "ASH" },
    { onConflict: "region_name" },
  );
  const { data: region } = await db.from("regions").select("id").eq("region_name", "Ashanti").single();

  // roles
  await db.from("roles").upsert(
    ROLES.map(([role_name, description]) => ({ role_name, description })),
    { onConflict: "role_name" },
  );

  // settings
  await db.from("settings").upsert([
    { key: "performance_bands", value: { growing_above: 0.5, declining_below: -0.5 } },
    { key: "growth_when_previous_zero", value: "n/a" },
    { key: "region_default", value: "Ashanti" },
  ], { onConflict: "key" });

  // zones
  const zones = read("zones.json").map((z: any) => ({
    id: z.id, zone_name: z.zone_name, zone_code: z.zone_code,
    region_id: region!.id, is_active: z.is_active,
  }));
  await db.from("zones").upsert(zones, { onConflict: "zone_name" });

  // districts
  const districts = read("districts.json").map((d: any) => ({
    id: d.id, district_name: d.district_name, district_code: d.district_code,
    zone_id: d.zone_id, is_active: d.is_active,
  }));
  await db.from("districts").upsert(districts, { onConflict: "district_name" });

  // aliases
  const aliases = read("district_aliases.json").map((a: any) => ({
    district_id: a.district_id, alias: a.alias, normalized_alias: a.normalized_alias,
  }));
  await db.from("district_aliases").upsert(aliases, { onConflict: "normalized_alias" });

  console.log(
    `seeded: 1 region, ${ROLES.length} roles, ${zones.length} zones, ` +
    `${districts.length} districts, ${aliases.length} aliases`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
