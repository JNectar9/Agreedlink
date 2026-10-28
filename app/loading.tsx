import { LogoMark } from '@/components/Logo';

// Brand loading screen shown while a page loads. Navy background, logo, tagline, progress bar.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy px-6 text-center text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/2 h-72 w-[140%] -translate-x-1/2 rounded-[50%] bg-brand/30 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-[50%] bg-brand/40 blur-xl" />
      <div className="relative">
        <LogoMark size={76} light />
      </div>
      <p className="relative mt-4 text-3xl font-bold tracking-tight">AgreedLink</p>
      <p className="relative mt-2 text-blue-100">Your agreements.<br />Our priority.</p>
      <div className="relative mt-8 h-1.5 w-44 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
        <div className="h-full w-2/5 animate-loadbar rounded-full bg-brand" />
      </div>
      <span className="sr-only">Loading AgreedLink</span>
    </div>
  );
}
