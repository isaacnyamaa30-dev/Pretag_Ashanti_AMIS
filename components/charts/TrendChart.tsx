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

export type TrendPoint = { label: string; members: number | null; projected?: number | null };

export function TrendChart({
  data,
  projection = [],
}: {
  data: { label: string; members: number }[];
  projection?: { label: string; members: number }[];
}) {
  if (data.length < 2) {
    return (
      <p className="text-sm text-ink-3 font-mono py-8 text-center">
        The trend appears once a second month is imported.
      </p>
    );
  }

  const merged: TrendPoint[] = data.map((d) => ({ label: d.label, members: d.members, projected: null }));
  if (projection.length) {
    // bridge: last real point also seeds the projected line
    merged[merged.length - 1].projected = data[data.length - 1].members;
    for (const p of projection) merged.push({ label: p.label, members: null, projected: p.members });
  }

  const vals = [...data.map((d) => d.members), ...projection.map((p) => p.members)];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(50, Math.round((max - min) * 0.15));

  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={merged} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
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
            formatter={(v: number) => [v?.toLocaleString?.() ?? v, "members"]}
          />
          <Line
            type="monotone"
            dataKey="members"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--primary)" }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          {projection.length > 0 && (
            <Line
              type="monotone"
              dataKey="projected"
              stroke="var(--ink-3)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 2.5, fill: "var(--ink-3)" }}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
