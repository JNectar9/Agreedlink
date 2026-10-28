import Link from 'next/link';
import { LogoMark } from './Logo';
import { Waves } from './Waves';

/** Shared navy screen with the logo, tagline and waves for sign up, log in and password pages. */
export function AuthShell({ subtitle = 'Create, manage and sign agreements with confidence.', children }: { subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#020B22] via-navy to-[#06235A] text-white">
      <Waves />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-5 pb-44 pt-8 text-center sm:pb-56 sm:pt-12">
        <Link href="/" aria-label="AgreedLink home" className="flex flex-col items-center">
          <LogoMark size={72} blue />
          <span className="mt-2 text-4xl font-bold tracking-tight">Agreed<span className="text-brand">Link</span></span>
        </Link>
        <h1 className="mt-6 text-3xl font-semibold leading-tight !text-white">Your agreements.<br />Our priority.</h1>
        <p className="mt-3 max-w-xs text-base text-blue-300">{subtitle}</p>
        <div className="mt-7 w-full space-y-4">{children}</div>
        <p className="mt-8 text-xs text-blue-300">Created by JNectar</p>
      </main>
    </div>
  );
}
