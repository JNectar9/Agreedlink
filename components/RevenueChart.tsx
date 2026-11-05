import { chartGeometry, type TrendPoint } from '@/lib/admin-dashboard';
import { usd, usdShort } from '@/lib/subscriptions';

const W = 360;
const H = 220;
const PAD = { left: 44, right: 14, top: 22, bottom: 26 };

/** Revenue trend as a plain SVG (no chart library, nothing sent to the browser but markup). Scales to any screen width. */
export function RevenueChart({ trend }: { trend: TrendPoint[] }) {
  const g = chartGeometry(trend, W, H, PAD);
  const last = g.points[g.points.length - 1];
  const summary = trend.length
    ? `Revenue by month: ${g.points.map((p) => `${p.label} ${usd(p.value)}`).join(', ')}.`
    : 'No revenue data yet.';
  // Keep the "this month" bubble inside the chart: flip it left when the last point is near the right edge.
  const bubbleW = 92;
  const bubbleX = last ? Math.min(Math.max(last.x - bubbleW / 2, 2), W - bubbleW - 2) : 0;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="h-auto w-full max-w-2xl">
        <title>Revenue trend</title>
        {g.ticks.map((t) => (
          <g key={t.value}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y} stroke="#E1E8F5" strokeWidth="1" />
            <text x={PAD.left - 6} y={t.y + 3.5} textAnchor="end" fontSize="10" fill="#64748B">{usdShort(t.value)}</text>
          </g>
        ))}
        {g.area ? <path d={g.area} fill="#1769FF" fillOpacity="0.12" /> : null}
        {g.line ? <path d={g.line} fill="none" stroke="#1769FF" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {g.points.map((p, i) => (
          <g key={`${p.label}-${i}`}>
            <circle cx={p.x} cy={p.y} r={i === g.points.length - 1 ? 5 : 3.5} fill="#1769FF" stroke="#fff" strokeWidth="1.5" />
            <text x={p.x} y={H - 8} textAnchor="middle" fontSize="10" fill="#64748B">{p.label}</text>
          </g>
        ))}
        {last ? (
          <g>
            <rect x={bubbleX} y={Math.max(last.y - 38, 2)} width={bubbleW} height="30" rx="7" fill="#1769FF" />
            <text x={bubbleX + bubbleW / 2} y={Math.max(last.y - 38, 2) + 13} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{usd(last.value)}</text>
            <text x={bubbleX + bubbleW / 2} y={Math.max(last.y - 38, 2) + 24} textAnchor="middle" fontSize="9" fill="#fff">This month</text>
          </g>
        ) : null}
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
