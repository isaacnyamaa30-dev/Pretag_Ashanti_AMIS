"use client";

import dynamic from "next/dynamic";

/* Recharts is ~100 KB. Load it after the page has painted so the figures and
   tables show immediately, especially on a phone on a slow connection. */

function ChartFallback({ height }: { height: number }) {
  return <div className="shimmer rounded" style={{ width: "100%", height }} />;
}

export const TrendChart = dynamic(
  () => import("./TrendChart").then((m) => m.TrendChart),
  { ssr: false, loading: () => <ChartFallback height={260} /> },
);

export const ZoneGrowthChart = dynamic(
  () => import("./ZoneGrowthChart").then((m) => m.ZoneGrowthChart),
  { ssr: false, loading: () => <ChartFallback height={300} /> },
);
