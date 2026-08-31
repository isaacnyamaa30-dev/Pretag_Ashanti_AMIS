import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";

export const metadata = { title: "Member Search - PRETAG AMIS" };

export default async function MembersPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const supabase = createClient();

  let results: {
    id: number;
    employee_no: string;
    current_name: string | null;
    current_management_unit: string | null;
    zones: { zone_name?: string } | null;
    districts: { district_name?: string } | null;
  }[] = [];

  if (q.length >= 2) {
    const numeric = /^\d+$/.test(q);
    let query = supabase
      .from("members")
      .select("id, employee_no, current_name, current_management_unit, zones:current_zone_id(zone_name), districts:current_district_id(district_name)")
      .limit(50);
    query = numeric
      ? query.like("employee_no", `${q}%`)
      : query.ilike("current_name", `%${q}%`);
    const { data } = await query.order("current_name");
    results = (data ?? []) as typeof results;
  }

  return (
    <>
      <PageHeader
        title="Member Search"
        sub="Find a member by employee number (fastest) or by name."
      />

      <Card className="mb-6">
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Employee number or name"
            className="grow border border-border-strong rounded bg-ground px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button className="font-mono text-xs uppercase tracking-wide bg-primary text-on-primary rounded px-4">
            Search
          </button>
        </form>
      </Card>

      {q.length >= 2 && (
        <>
          <p className="text-xs font-mono text-ink-3 mb-3">
            {results.length}{results.length === 50 ? "+" : ""} result{results.length === 1 ? "" : "s"}
          </p>
          <div className="overflow-x-auto border border-border rounded">
            <table className="w-full text-sm font-mono min-w-[640px]">
              <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3 py-2">Employee no</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Management unit</th>
                  <th className="text-left px-3 py-2">Zone / District</th>
                </tr>
              </thead>
              <tbody>
                {results.map((m) => (
                  <tr key={m.id} className="border-t border-border hover:bg-surface-2">
                    <td className="px-3 py-2">
                      <Link href={`/members/${m.employee_no}`} className="underline">
                        {m.employee_no}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{m.current_name}</td>
                    <td className="px-3 py-2 text-ink-3">{m.current_management_unit}</td>
                    <td className="px-3 py-2 text-ink-3">
                      {(m.zones as { zone_name?: string } | null)?.zone_name}
                      {" / "}
                      {(m.districts as { district_name?: string } | null)?.district_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
