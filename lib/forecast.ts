/**
 * Simple membership projection - ordinary least-squares line through the
 * imported periods, extended a few months. Clearly a projection, not a promise.
 */
export type Point = { label: string; members: number };

export function projectMembership(series: Point[], monthsAhead = 3): Point[] {
  if (series.length < 2) return [];
  const n = series.length;
  const xs = series.map((_, i) => i);
  const ys = series.map((p) => p.members);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;

  const out: Point[] = [];
  for (let k = 1; k <= monthsAhead; k++) {
    const x = n - 1 + k;
    out.push({ label: `+${k}m`, members: Math.max(0, Math.round(intercept + slope * x)) });
  }
  return out;
}

export function monthlyRate(series: Point[]): number | null {
  if (series.length < 2) return null;
  const first = series[0].members;
  const last = series[series.length - 1].members;
  const months = series.length - 1;
  if (first === 0) return null;
  return Math.round(((last - first) / first / months) * 10000) / 100;
}
