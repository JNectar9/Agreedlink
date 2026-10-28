// Skeleton shown inside the dashboard while data loads.
export default function DashboardLoading() {
  const bar = 'animate-pulse rounded-xl bg-line';
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="space-y-2"><div className={`${bar} h-8 w-2/3 max-w-sm`} /><div className={`${bar} h-4 w-1/2 max-w-xs`} /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => (<div key={i} className={`${bar} h-20`} />))}</div>
      <div className={`${bar} h-56`} />
      <div className="space-y-3">{[0, 1, 2].map((i) => (<div key={i} className={`${bar} h-20`} />))}</div>
      <span className="sr-only">Loading your dashboard</span>
    </div>
  );
}
