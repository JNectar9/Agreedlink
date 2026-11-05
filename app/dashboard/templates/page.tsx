import Link from 'next/link';
import { ArrowRight, LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { requireSession } from '@/lib/data';
import { TEMPLATES } from '@/lib/templates';
import { toSavedTemplate, templateErrorCopy, TEMPLATE_LIMITS } from '@/lib/saved-templates';
import { formatDateTime } from '@/lib/time';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { createTemplateAction, deleteTemplateAction } from './actions';

export const metadata = { title: 'Templates' };
export const dynamic = 'force-dynamic';

export default async function TemplatesPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { supabase, profile } = await requireSession();
  const [listRes, subRes] = await Promise.all([
    supabase.from('saved_templates').select('id, name, summary, fields, created_at').order('created_at', { ascending: false }).limit(100),
    supabase.rpc('my_subscription')
  ]);
  const saved = (listRes.data ?? []).map(toSavedTemplate).filter((t): t is NonNullable<ReturnType<typeof toSavedTemplate>> => t !== null);
  const limitRaw = (subRes.data as { limits?: { saved_templates?: number } } | null)?.limits?.saved_templates;
  const limit = typeof limitRaw === 'number' ? limitRaw : 1;
  const used = saved.length;
  const full = used >= limit;
  const setupError = listRes.error ?? null;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl">Templates</h1>
        <p className="mt-1 text-sm text-muted">Start from ready-made text or from your own saved templates, then edit everything before you send. Templates are starting points, not legal advice.</p>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />
      {setupError ? <Notice error={templateErrorCopy(setupError)} /> : null}

      <section className="space-y-3" aria-label="My templates">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">My templates</h2>
          <p className="text-sm text-muted">{used} of {limit} saved{full ? ' (limit reached)' : ''}</p>
        </div>
        {used === 0 && !setupError ? <p className="card text-sm text-muted">You have no saved templates yet. Create one below and reuse it for similar agreements.</p> : null}
        {used > limit ? <p role="status" className="rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">You have more saved templates than your current plan allows. Nothing was deleted and you can still use them, but you cannot save new ones until you are under the limit.</p> : null}
        <ul className="grid gap-4 sm:grid-cols-2">
          {saved.map((t) => (
            <li key={t.id} className="card flex min-w-0 flex-col">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden="true"><LayoutTemplate size={20} /></span>
              <h3 className="mt-3 break-words text-lg">{t.name}</h3>
              <p className="mt-1 break-words text-sm text-muted">{t.summary || (t.fields.description ?? '').slice(0, 120) || 'No description.'}</p>
              <p className="mt-1 text-xs text-muted">Saved {formatDateTime(t.created_at, profile.timezone)}</p>
              <div className="mt-4 flex flex-1 flex-col justify-end gap-2">
                <Link href={`/dashboard/agreements/new?saved=${t.id}`} className="btn-primary w-full">Use this template <ArrowRight size={16} aria-hidden="true" /></Link>
                <details className="rounded-xl border border-line p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-bad">Delete</summary>
                  <form action={deleteTemplateAction} className="mt-3 space-y-2">
                    <input type="hidden" name="template_id" value={t.id} />
                    <p className="text-xs text-muted">This removes only the template. Agreements already created from it stay as they are.</p>
                    <SubmitButton variant="danger" pendingText="Deleting..." className="w-full"><Trash2 size={16} aria-hidden="true" /> Delete template</SubmitButton>
                  </form>
                </details>
              </div>
            </li>
          ))}
        </ul>

        <details className="card" open={used === 0 && !setupError}>
          <summary className="flex cursor-pointer items-center gap-2 text-lg font-semibold text-navy"><Plus size={18} aria-hidden="true" /> Create a template</summary>
          {full ? <p role="status" className="mt-3 rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">You have reached the limit of {limit} saved template{limit === 1 ? '' : 's'} on your plan. Delete one to save another, or see <Link href="/dashboard/billing" className="font-semibold underline">Billing</Link> to upgrade.</p> : null}
          <form action={createTemplateAction} className="mt-4 space-y-4">
            <fieldset disabled={full || Boolean(setupError)} className="space-y-4 disabled:opacity-60">
              <div><label htmlFor="name" className="label">Template name</label><input id="name" name="name" required minLength={2} maxLength={TEMPLATE_LIMITS.name} className="input" /></div>
              <div><label htmlFor="summary" className="label">Short description (optional)</label><input id="summary" name="summary" maxLength={TEMPLATE_LIMITS.summary} className="input" /></div>
              <div><label htmlFor="description" className="label">Project description</label><textarea id="description" name="description" rows={3} maxLength={TEMPLATE_LIMITS.description} className="input" /></div>
              <div><label htmlFor="deliverables" className="label">Deliverables</label><textarea id="deliverables" name="deliverables" rows={3} maxLength={TEMPLATE_LIMITS.deliverables} className="input" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="included_revisions" className="label">Included revisions</label><input id="included_revisions" name="included_revisions" type="number" min={0} max={50} className="input" /></div>
                <div>
                  <label htmlFor="additional_work_pricing" className="label">Extra work is priced</label>
                  <select id="additional_work_pricing" name="additional_work_pricing" defaultValue="" className="input">
                    <option value="">Leave to choose each time</option>
                    <option value="quote_first">Quoted before it begins</option>
                    <option value="hourly">Hourly</option>
                    <option value="fixed_per_item">Fixed price per item</option>
                  </select>
                </div>
              </div>
              <div><label htmlFor="revision_definition" className="label">What counts as a revision</label><textarea id="revision_definition" name="revision_definition" rows={2} maxLength={TEMPLATE_LIMITS.revision_definition} className="input" /></div>
              <div><label htmlFor="excluded_work" className="label">Work that is not included</label><textarea id="excluded_work" name="excluded_work" rows={2} maxLength={TEMPLATE_LIMITS.excluded_work} className="input" /></div>
              <div><label htmlFor="payment_terms_text" className="label">Payment terms (information only)</label><textarea id="payment_terms_text" name="payment_terms_text" rows={3} maxLength={TEMPLATE_LIMITS.payment_terms_text} className="input" /></div>
              <p className="hint">Prices, dates and customer details are not saved in a template. You enter those for each agreement.</p>
              <SubmitButton pendingText="Saving..." className="w-full sm:w-auto">Save template</SubmitButton>
            </fieldset>
          </form>
        </details>
      </section>

      <section className="space-y-3" aria-label="Ready-made starters">
        <h2 className="text-lg">Ready-made starters</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <li key={t.id} className="card flex flex-col">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand" aria-hidden="true"><LayoutTemplate size={20} /></span>
              <h3 className="mt-3 text-lg">{t.name}</h3>
              <p className="mt-1 flex-1 text-sm text-muted">{t.summary}</p>
              <Link href={`/dashboard/agreements/new?template=${t.id}`} className="btn-primary mt-4 w-full">Use this template <ArrowRight size={16} aria-hidden="true" /></Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
