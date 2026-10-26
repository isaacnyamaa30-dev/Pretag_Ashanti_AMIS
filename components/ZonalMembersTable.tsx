"use client";

import { useMemo, useState } from "react";
import type { RegisterMember } from "@/lib/r20/zonal-export";

export function ZonalMembersTable({
  members,
  districts,
}: {
  members: RegisterMember[];
  districts: string[];
}) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      if (district && m.district !== district) return false;
      if (!needle) return true;
      return (
        m.employeeNo.toLowerCase().includes(needle) ||
        m.name.toLowerCase().includes(needle) ||
        m.managementUnit.toLowerCase().includes(needle)
      );
    });
  }, [members, q, district]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search employee no, name or management unit"
          className="flex-1 min-w-[220px] border border-border-strong rounded bg-ground px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="border border-border-strong rounded bg-ground px-2.5 py-2 text-sm"
        >
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <p className="text-xs font-mono text-ink-3 mb-2">
        {filtered.length} of {members.length} member{members.length === 1 ? "" : "s"} shown
      </p>

      <div className="overflow-x-auto border border-border rounded max-h-[480px]">
        <table className="w-full text-sm font-mono min-w-[640px]">
          <thead className="bg-primary text-on-primary text-[11px] uppercase tracking-wide sticky top-0">
            <tr>
              <th className="text-left px-3 py-2">Employee No</th>
              <th className="text-left px-3 py-2">Name of Employee</th>
              <th className="text-left px-3 py-2">Management Unit</th>
              <th className="text-left px-3 py-2">District</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.employeeNo} className="border-t border-border hover:bg-surface-2">
                <td className="px-3 py-2">{m.employeeNo}</td>
                <td className="px-3 py-2">{m.name}</td>
                <td className="px-3 py-2 text-ink-3">{m.managementUnit}</td>
                <td className="px-3 py-2 text-ink-3">{m.district}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-ink-3">
                  No members match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
