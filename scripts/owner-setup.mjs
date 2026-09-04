/**
 * One-off: provision the private owner / developer account and the
 * `access_suspended` setting used by the Developer console.
 *
 *   node scripts/owner-setup.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Idempotent - safe to re-run. Prints a password-set link for the owner to
 * follow; this script never chooses or stores a password.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const OWNER_EMAIL = (process.env.DEVELOPER_EMAIL || "sarisitsolution@gmail.com").toLowerCase();
const OWNER_NAME = "Isaac Nyamaa Boadi (Owner)";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

// 1. access_suspended setting (default: open)
{
  const { data: existing } = await sb
    .from("settings")
    .select("value")
    .eq("key", "access_suspended")
    .maybeSingle();
  if (!existing) {
    const { error } = await sb.from("settings").insert({
      key: "access_suspended",
      value: { suspended: false, message: "", updated_at: new Date().toISOString() },
    });
    if (error) throw error;
    console.log("• created settings.access_suspended = { suspended: false }");
  } else {
    console.log("• settings.access_suspended already present:", existing.value);
  }
}

// 2. owner auth user
let authId;
{
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
  const found = list.users.find((u) => (u.email || "").toLowerCase() === OWNER_EMAIL);
  if (found) {
    authId = found.id;
    console.log(`• owner auth user already exists: ${OWNER_EMAIL} (${authId})`);
  } else {
    const tempPassword = "chg-" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const { data, error } = await sb.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: tempPassword,
      email_confirm: true,
    });
    if (error) throw error;
    authId = data.user.id;
    console.log(`• created owner auth user: ${OWNER_EMAIL} (${authId})`);
  }
}

// 3. users row (Super Administrator, whole region)
{
  const { data: role } = await sb
    .from("roles")
    .select("id")
    .eq("role_name", "Super Administrator")
    .single();
  const { data: existing } = await sb.from("users").select("id").eq("auth_id", authId).maybeSingle();
  if (existing) {
    await sb
      .from("users")
      .update({ full_name: OWNER_NAME, email: OWNER_EMAIL, role_id: role.id, scope: "region", is_active: true })
      .eq("id", existing.id);
    console.log("• updated owner users row");
  } else {
    const { error } = await sb.from("users").insert({
      auth_id: authId,
      full_name: OWNER_NAME,
      email: OWNER_EMAIL,
      role_id: role.id,
      scope: "region",
      is_active: true,
    });
    if (error) throw error;
    console.log("• created owner users row");
  }
}

// 4. set a fresh temporary password (change it from the Developer console after first sign-in)
{
  const words = ["Ashanti", "Kumasi", "Region", "Union", "Teacher", "Owner", "Access", "Return"];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const tempPassword = `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const { error } = await sb.auth.admin.updateUserById(authId, { password: tempPassword });
  if (error) throw error;
  console.log("\n=== OWNER ACCOUNT ===");
  console.log("Email:    ", OWNER_EMAIL);
  console.log("Password: ", tempPassword, " (temporary - change it in the Developer console)");
  console.log("\nThen set DEVELOPER_EMAIL =", OWNER_EMAIL, "in the environment and redeploy.");
}
