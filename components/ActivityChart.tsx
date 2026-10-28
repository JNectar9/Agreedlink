import type { DayBucket } from '@/lib/stats';

/** Simple area chart drawn from real counts. Shows an honest empty message when there is no data. */
export function ActivityChart({ data, label, emptyText }: { data: DayBucket[]; label: string; emptyText: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const w = 300;
  const h = 120;
  const pad = 10;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = (w - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((d, i) => [pad + i * step, h - pad - (d.value / max) * (h - pad * 2)] as const);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${pad},${h - pad} ${line} ${(pad + (data.length - 1) * step).toFixed(1)},${h - pad}`;
  const first = data[0]?.label;
  const last = data[data.length - 1]?.label;
  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" role="img" aria-label={`${label}. Total: ${total}.`} preserveAspectRatio="none">
          {[0.25, 0.5, 0.75].map((f) => (<line key={f} x1={pad} x2={w - pad} y1={h - pad - f * (h - pad * 2)} y2={h - pad - f * (h - pad * 2)} stroke="#E1E8F5" strokeWidth="1" />))}
          <polygon points={area} fill="#1769FF" opacity="0.12" />
          <polyline points={line} fill="none" stroke="#1769FF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {pts.map((p, i) => (<circle key={data[i].key} cx={p[0]} cy={p[1]} r="2.5" fill="#1769FF" />))}
        </svg>
        {total === 0 ? <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-muted">{emptyText}</p> : null}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted"><span>{first}</span><span>Peak: {max === 1 && total === 0 ? 0 : max}</span><span>{last}</span></div>
    </div>
  );
}
