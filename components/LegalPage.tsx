import { AlertTriangle } from 'lucide-react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl">{title}</h1>
        <p role="note" className="mt-4 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>Starter draft. A qualified professional must review this page before AgreedLink is launched publicly.</span>
        </p>
        <div className="mt-6 space-y-4 leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:text-xl [&_li]:ml-5 [&_li]:list-disc">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
