"use client";

import { useMemo, useState } from "react";
import type { DirectoryTree, DirectoryZone, DirectoryDistrict, DirectoryUnit } from "@/lib/r20/zonal-export";

type ViewDistrict = { district: DirectoryDistrict; units: DirectoryUnit[] };
type ViewZone = { zone: DirectoryZone; districts: ViewDistrict[] };

const key = (...parts: (string | number)[]) => parts.join(":");

function Chevron({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="inline-block w-4 text-center font-mono text-ink-3">
      {open ? "▼" : "▶"}
    </span>
  );
}

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="font-mono text-[10px] uppercase tracking-wide border border-border-strong rounded px-2 py-1 hover:bg-surface-2 whitespace-nowrap"
    >
      <span aria-hidden>&#8681; </span>
      {label}
    </a>
  );
}

export function ZonalDirectory({
  tree,
  periodId,
  canBulkExport,
}: {
  tree: DirectoryTree;
  periodId: number;
  canBulkExport: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");

  const districtOptions = useMemo(() => {
    const out: { id: number; name: string }[] = [];
    for (const z of tree.zones) {
      if (zoneFilter && String(z.id) !== zoneFilter) continue;
      for (const d of z.districts) out.push({ id: d.id, name: d.name });
    }
    return out;
  }, [tree, zoneFilter]);

  const unitOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const z of tree.zones) {
      if (zoneFilter && String(z.id) !== zoneFilter) continue;
      for (const d of z.districts) {
        if (districtFilter && String(d.id) !== districtFilter) continue;
        for (const u of d.units) seen.add(u.name);
      }
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [tree, zoneFilter, districtFilter]);

  const needle = query.trim().toLowerCase();
  const isSearching = needle.length > 0;

  const view: ViewZone[] = useMemo(() => {
    function unitMatches(u: DirectoryUnit, districtName: string, zoneName: string) {
      if (unitFilter && u.name !== unitFilter) return false;
      if (!needle) return true;
      if (u.name.toLowerCase().includes(needle)) return true;
      if (districtName.toLowerCase().includes(needle)) return true;
      if (zoneName.toLowerCase().includes(needle)) return true;
      return u.members.some(
        (m) => m.name.toLowerCase().includes(needle) || m.employeeNo.toLowerCase().includes(needle),
      );
    }

    const zones: ViewZone[] = [];
    for (const z of tree.zones) {
      if (zoneFilter && String(z.id) !== zoneFilter) continue;
      const districts: ViewDistrict[] = [];
      for (const d of z.districts) {
        if (districtFilter && String(d.id) !== districtFilter) continue;
        const units = d.units.filter((u) => unitMatches(u, d.name, z.name));
        if (units.length > 0) districts.push({ district: d, units });
      }
      if (districts.length > 0) zones.push({ zone: z, districts });
    }
    return zones;
  }, [tree, zoneFilter, districtFilter, unitFilter, needle]);

  const open = (k: string) => isSearching || expanded.has(k);
  const toggle = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const expandAll = () => {
    const next = new Set<string>();
    for (const { zone, districts } of view) {
      next.add(key("z", zone.id));
      for (const { district, units } of districts) {
        next.add(key("d", district.id));
        for (const u of units) next.add(key("u", district.id, u.name));
      }
    }
    setExpanded(next);
  };
  const collapseAll = () => setExpanded(new Set());

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={expandAll}
          className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5"
        >
          Expand All
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="font-mono text-xs uppercase tracking-wide border border-border-strong rounded px-3 py-1.5"
        >
          Collapse All
        </button>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search zone, district, school, name or employee no"
          className="w-full sm:flex-1 sm:min-w-[220px] border border-border-strong rounded bg-ground px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={zoneFilter}
          onChange={(e) => {
            setZoneFilter(e.target.value);
            setDistrictFilter("");
            setUnitFilter("");
          }}
          className="w-full sm:w-auto max-w-full border border-border-strong rounded bg-ground px-2.5 py-2 text-sm"
        >
          <option value="">All zones</option>
          {tree.zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
        <select
          value={districtFilter}
          onChange={(e) => {
            setDistrictFilter(e.target.value);
            setUnitFilter("");
          }}
          className="w-full sm:w-auto max-w-full border border-border-strong rounded bg-ground px-2.5 py-2 text-sm"
        >
          <option value="">All districts</option>
          {districtOptions.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={unitFilter}
          onChange={(e) => setUnitFilter(e.target.value)}
          className="w-full sm:w-auto max-w-full border border-border-strong rounded bg-ground px-2.5 py-2 text-sm"
        >
          <option value="">All management units</option>
          {unitOptions.map((u) => (
            <option key={u} value={u}>{u || "(not recorded)"}</option>
          ))}
        </select>
      </div>

      {view.length === 0 && (
        <p className="text-sm text-ink-3 font-mono py-6 text-center">No matches.</p>
      )}

      <div className="flex flex-col gap-2">
        {view.map(({ zone, districts }) => {
          const zKey = key("z", zone.id);
          const zOpen = open(zKey);
          return (
            <div key={zone.id} className="border border-border rounded bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggle(zKey)}
                  className="flex flex-1 items-center gap-2 text-left font-display text-sm uppercase tracking-tight min-w-0"
                >
                  <Chevron open={zOpen} />
                  <span className="truncate">{zone.name} Zone</span>
                  <span className="font-mono text-xs text-ink-3 shrink-0">({zone.count.toLocaleString()} members)</span>
                </button>
                <div className="flex gap-2 shrink-0">
                  <DownloadLink href={`/api/exports/zonal?period=${periodId}&zone=${zone.id}&type=xlsx`} label="Excel" />
                  <DownloadLink href={`/api/exports/zonal?period=${periodId}&zone=${zone.id}&type=docx`} label="Word" />
                </div>
              </div>

              {zOpen && (
                <div className="border-t border-border px-3 py-2 flex flex-col gap-2">
                  {districts.map(({ district, units }) => {
                    const dKey = key("d", district.id);
                    const dOpen = open(dKey);
                    return (
                      <div key={district.id} className="border border-border rounded">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-surface-2">
                          <button
                            type="button"
                            onClick={() => toggle(dKey)}
                            className="flex flex-1 items-center gap-2 text-left font-mono text-sm min-w-0"
                          >
                            <Chevron open={dOpen} />
                            <span className="truncate">{district.name}</span>
                            <span className="font-mono text-xs text-ink-3 shrink-0">({district.count.toLocaleString()} members)</span>
                          </button>
                          <div className="flex gap-2 shrink-0">
                            <DownloadLink href={`/api/exports/zonal?period=${periodId}&type=district&district=${district.id}`} label="Excel" />
                            <DownloadLink href={`/api/exports/zonal?period=${periodId}&type=district-docx&district=${district.id}`} label="Word" />
                          </div>
                        </div>

                        {dOpen && (
                          <div className="px-3 py-2 flex flex-col gap-2">
                            {units.map((u) => {
                              const uKey = key("u", district.id, u.name);
                              const uOpen = open(uKey);
                              const unitParam = encodeURIComponent(u.name);
                              return (
                                <div key={u.name || "(blank)"} className="border border-border rounded">
                                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
                                    <button
                                      type="button"
                                      onClick={() => toggle(uKey)}
                                      className="flex flex-1 items-center gap-2 text-left text-sm min-w-0"
                                    >
                                      <Chevron open={uOpen} />
                                      <span className="truncate">{u.name || "(not recorded)"}</span>
                                      <span className="font-mono text-xs text-ink-3 shrink-0">({u.count.toLocaleString()} members)</span>
                                    </button>
                                    <div className="flex gap-2 shrink-0">
                                      <DownloadLink
                                        href={`/api/exports/zonal?period=${periodId}&type=unit&district=${district.id}&unit=${unitParam}`}
                                        label="Excel"
                                      />
                                      <DownloadLink
                                        href={`/api/exports/zonal?period=${periodId}&type=unit-docx&district=${district.id}&unit=${unitParam}`}
                                        label="Word"
                                      />
                                    </div>
                                  </div>

                                  {uOpen && (
                                    <div className="overflow-x-auto border-t border-border">
                                      <table className="w-full text-xs font-mono min-w-[520px]">
                                        <thead className="bg-primary text-on-primary uppercase tracking-wide">
                                          <tr>
                                            <th className="text-left px-2.5 py-1.5">Employee No</th>
                                            <th className="text-left px-2.5 py-1.5">Name of Employee</th>
                                            <th className="text-left px-2.5 py-1.5">Management Unit</th>
                                            <th className="text-left px-2.5 py-1.5">District</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {u.members.map((m) => (
                                            <tr key={m.employeeNo} className="border-t border-border odd:bg-surface-2">
                                              <td className="px-2.5 py-1.5">{m.employeeNo}</td>
                                              <td className="px-2.5 py-1.5">{m.name}</td>
                                              <td className="px-2.5 py-1.5 text-ink-3">{m.managementUnit || "—"}</td>
                                              <td className="px-2.5 py-1.5 text-ink-3">{m.district}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canBulkExport && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-[11px] font-mono text-ink-3">
            Need every zone at once? Use &ldquo;Download all 18 zones&rdquo; below.
          </p>
        </div>
      )}
    </div>
  );
}
