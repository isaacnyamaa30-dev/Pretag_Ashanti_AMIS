"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function TrendChart({ data }: { data: { label: string; members: number }[] }) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-ink-3 font-mono py-8 text-center">
        The trend appears once a second month is imported.
      </p>
    );
  }
  const min = Math.min(...data.map((d) => d.members));
  const max = Math.max(...data.map((d) => d.members));
  const pad = Math.max(50, Math.round((max - min) * 0.15));

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--ink-3)" }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            domain={[Math.max(0, min - pad), max + pad]}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "var(--ink-3)" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--ink)" }}
            formatter={(v: number) => [v.toLocaleString(), "members"]}
          />
          <Line
            type="monotone"
            dataKey="members"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--primary)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
