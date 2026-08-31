"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";

export function ZoneGrowthChart({ data }: { data: { name: string; net: number }[] }) {
  const sorted = [...data].sort((a, b) => a.net - b.net);
  return (
    <div style={{ width: "100%", height: Math.max(260, sorted.length * 22) }}>
      <ResponsiveContainer>
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--ink-3)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--ink-2)" }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="var(--border-strong)" />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            formatter={(v: number) => [`${v > 0 ? "+" : ""}${v}`, "net change"]}
            cursor={{ fill: "var(--surface-2)" }}
          />
          <Bar dataKey="net" radius={2}>
            {sorted.map((d) => (
              <Cell key={d.name} fill={d.net >= 0 ? "var(--grow)" : "var(--decline)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
