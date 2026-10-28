import Link from 'next/link';
import { ArrowRight, LayoutTemplate } from 'lucide-react';
import { TEMPLATES } from '@/lib/templates';

export const metadata = { title: 'Templates' };

export default function TemplatesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl">Templates</h1>
        <p className="mt-1 text-sm text-muted">Start from ready-made text, then edit everything before you send. Templates are starting points, not legal advice.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <li key={t.id} className="card flex flex-col">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden="true"><LayoutTemplate size={20} /></span>
            <h2 className="mt-3 text-lg">{t.name}</h2>
            <p className="mt-1 flex-1 text-sm text-muted">{t.summary}</p>
            <Link href={`/dashboard/agreements/new?template=${t.id}`} className="btn-primary mt-4 w-full">Use this template <ArrowRight size={16} aria-hidden="true" /></Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
