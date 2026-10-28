import { ChevronDown } from 'lucide-react';
import { FAQ } from '@/lib/faq';

export function Faq({ limit }: { limit?: number }) {
  const items = limit ? FAQ.slice(0, limit) : FAQ;
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((item) => (
        <details key={item.q} className="group px-4 py-1 sm:px-5">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-2 text-left font-semibold text-navy">
            {item.q}
            <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
