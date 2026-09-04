/**
 * One-off recovery:
 *  1. re-enable the shared trial login (isaacnyamaa30@gmail.com) that was
 *     disabled by mistake,
 *  2. move the private owner account to sarisitsolution@gmail.com,
 *  3. set a fresh temporary password on the owner account and print it.
 *
 *   node scripts/fix-access.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const SHARED_EMAIL = "isaacnyamaa30@gmail.com";
const OLD_OWNER_EMAIL = "isaacnyamaa30+owner@gmail.com";
const NEW_OWNER_EMAIL = "sarisitsolution@gmail.com";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// 1. re-enable the shared login
{
  const { data, error } = await sb
    .from("users")
    .update({ is_active: true })
    .eq("email", SHARED_EMAIL)
    .select("id, email, is_active");
  if (error) throw error;
  console.log("• shared login re-enabled:", data);
}

// 2 + 3. migrate the owner account and reset its password
{
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 200 });
  const owner = list.users.find(
    (u) =>
      (u.email || "").toLowerCase() === OLD_OWNER_EMAIL ||
      (u.email || "").toLowerCase() === NEW_OWNER_EMAIL,
  );
  if (!owner) throw new Error("owner auth user not found");

  const words = ["Ashanti", "Kumasi", "Region", "Union", "Owner", "Access", "Return", "Saris"];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const tempPassword = `${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const { error: authErr } = await sb.auth.admin.updateUserById(owner.id, {
    email: NEW_OWNER_EMAIL,
    email_confirm: true,
    password: tempPassword,
  });
  if (authErr) throw authErr;

  const { error: rowErr } = await sb
    .from("users")
    .update({ email: NEW_OWNER_EMAIL, full_name: "Saris IT Solutions (Owner)" })
    .eq("auth_id", owner.id);
  if (rowErr) throw rowErr;

  console.log("\n=== OWNER ACCOUNT (updated) ===");
  console.log("Email:    ", NEW_OWNER_EMAIL);
  console.log("Password: ", tempPassword, " (temporary - change it in the Developer console)");
  console.log("\nSet DEVELOPER_EMAIL =", NEW_OWNER_EMAIL, "locally and on Vercel, then redeploy.");
}
