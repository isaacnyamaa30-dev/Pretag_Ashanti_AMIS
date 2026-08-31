import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { UserCreateForm } from "@/components/UserCreateForm";
import { updateUser, toggleUserActive } from "./actions";

export const metadata = { title: "Users - PRETAG AMIS" };

export default async function UsersPage() {
  const supabase = createClient();
  const [{ data: users, error }, { data: roles }, { data: zones }, { data: districts }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, email, scope, zone_id, district_id, is_active, role_id, roles(role_name)")
        .order("full_name"),
      supabase.from("roles").select("id, role_name").order("id"),
      supabase.from("zones").select("id, zone_name").order("zone_name"),
      supabase.from("districts").select("id, district_name").order("district_name"),
    ]);

  const roleOpts = (roles ?? []).map((r) => ({ id: r.id, label: r.role_name }));
  const zoneOpts = (zones ?? []).map((z) => ({ id: z.id, label: z.zone_name }));
  const districtOpts = (districts ?? []).map((d) => ({ id: d.id, label: d.district_name }));

  return (
    <>
      <PageHeader title="Users" sub="Who can sign in, and what data each person sees." />

      <Card className="mb-8">
        <h3 className="font-display text-sm uppercase tracking-tight mb-4">Add a user</h3>
        <UserCreateForm roles={roleOpts} zones={zoneOpts} districts={districtOpts} />
      </Card>

      {error && <p className="text-decline font-mono text-sm">{error.message}</p>}

      <div className="flex flex-col gap-2">
        {users?.map((u) => (
          <div key={u.id} className="bg-surface border border-border rounded px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <div>
                <span className="font-medium">{u.full_name}</span>{" "}
                <span className="font-mono text-xs text-ink-3">{u.email}</span>
              </div>
              <form action={toggleUserActive} className="flex items-center gap-2">
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="is_active" value={String(u.is_active)} />
                <span
                  className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                    u.is_active ? "bg-grow-wash text-grow" : "bg-surface-2 text-ink-3"
                  }`}
                >
                  {u.is_active ? "active" : "disabled"}
                </span>
                <button className="font-mono text-[11px] underline text-ink-3 hover:text-primary">
                  {u.is_active ? "disable" : "enable"}
                </button>
              </form>
            </div>

            <form action={updateUser} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={u.id} />
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wide text-ink-3">Role</span>
                <select
                  name="role_id"
                  defaultValue={u.role_id}
                  className="border border-border-strong rounded bg-ground px-2 py-1 text-sm outline-none focus:border-primary"
                >
                  {roles?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wide text-ink-3">Scope</span>
                <select
                  name="scope"
                  defaultValue={u.scope}
                  className="border border-border-strong rounded bg-ground px-2 py-1 text-sm outline-none focus:border-primary"
                >
                  <option value="region">Whole region</option>
                  <option value="zone">One zone</option>
                  <option value="district">One district</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wide text-ink-3">Zone (if zone-scoped)</span>
                <select
                  name="zone_id"
                  defaultValue={u.zone_id ?? ""}
                  className="border border-border-strong rounded bg-ground px-2 py-1 text-sm outline-none focus:border-primary"
                >
                  <option value="">-</option>
                  {zones?.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.zone_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-wide text-ink-3">District (if district-scoped)</span>
                <select
                  name="district_id"
                  defaultValue={u.district_id ?? ""}
                  className="border border-border-strong rounded bg-ground px-2 py-1 text-sm outline-none focus:border-primary"
                >
                  <option value="">-</option>
                  {districts?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.district_name}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton variant="ghost">Save</SubmitButton>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
