import { chartScale, type SeriesPoint } from '@/lib/affiliate';

const W = 640;
const H = 240;
const PAD = { left: 34, right: 12, top: 12, bottom: 26 };
const LINES = [
  { key: 'clicks', label: 'Clicks', color: '#2563EB' },
  { key: 'registrations', label: 'Registrations', color: '#172554' },
  { key: 'commissions', label: 'Commissions', color: '#16A34A' }
] as const;

/** Clicks, registrations and commissions (number earned per day) on one scale. Real data only. */
export function PerformanceChart({ points }: { points: SeriesPoint[] }) {
  const top = chartScale(points);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);
  const labelAt = [0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1];
  const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const total = (k: (typeof LINES)[number]['key']) => points.reduce((a, p) => a + p[k], 0);
  return (
    <figure>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {LINES.map((l) => <li key={l.key} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} /> {l.label}</li>)}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Clicks ${total('clicks')}, registrations ${total('registrations')}, commissions ${total('commissions')} in this period.`} className="h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#E2E8F0" />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748B">{Math.round(t)}</text>
          </g>
        ))}
        {LINES.map((l) => (
          <path key={l.key} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            d={points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p[l.key]).toFixed(1)}`).join(' ')} />
        ))}
        {points.length > 0 ? labelAt.map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#64748B">{fmt(points[i].day)}</text>
        )) : null}
      </svg>
      <figcaption className="sr-only">Daily clicks, registrations and commissions.</figcaption>
    </figure>
  );
}
