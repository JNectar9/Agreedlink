/** Decorative flowing waves for the bottom of the sign-up and log-in screens. */
export function Waves() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full sm:h-56" viewBox="0 0 1440 320" preserveAspectRatio="none">
      <defs>
        <linearGradient id="w1" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#0A3FBF" /><stop offset="1" stopColor="#1769FF" /></linearGradient>
        <linearGradient id="w2" x1="0" x2="1" y1="1" y2="0"><stop offset="0" stopColor="#061f66" /><stop offset="1" stopColor="#0E56E6" /></linearGradient>
      </defs>
      <path fill="url(#w2)" opacity="0.55" d="M0,200 C220,120 380,260 640,210 C900,160 1060,70 1440,150 L1440,320 L0,320 Z" />
      <path fill="url(#w1)" opacity="0.8" d="M0,250 C240,190 420,300 700,255 C980,210 1180,150 1440,215 L1440,320 L0,320 Z" />
      <path fill="none" stroke="#5EA0FF" strokeOpacity="0.6" strokeWidth="2" d="M0,235 C240,175 420,285 700,240 C980,195 1180,135 1440,200" />
      <path fill="#041649" opacity="0.9" d="M0,290 C300,255 520,320 820,285 C1060,258 1260,240 1440,270 L1440,320 L0,320 Z" />
    </svg>
  );
}
