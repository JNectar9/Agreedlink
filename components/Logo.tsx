export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="2.5" y="12" width="21" height="16" rx="8" stroke="#1769FF" strokeWidth="4" />
      <rect x="16.5" y="12" width="21" height="16" rx="8" stroke="#071A3D" strokeWidth="4" />
      <path d="M14 20.5l4.2 4.2L26.5 15.5" stroke="#1769FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
      <LogoMark />
      <span className={light ? 'text-white' : 'text-navy'}>
        Agreed<span className={light ? 'text-blue-300' : 'text-brand'}>Link</span>
      </span>
    </span>
  );
}
