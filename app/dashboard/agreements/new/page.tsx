import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { requireSession } from '@/lib/data';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { CURRENCIES, CURRENCY_CODES } from '@/lib/money';
import { createAgreementAction } from '../../actions';

export const metadata = { title: 'New agreement' };
export const dynamic = 'force-dynamic';

export default async function NewAgreementPage({ searchParams }: { searchParams: { error?: string } }) {
  const { profile } = await requireSession();
  const field = 'space-y-4';
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl sm:text-3xl">New agreement</h1>
      <p className="mt-1 text-muted">Record what you and your customer agreed. You will get a link to send them.</p>
      <div className="mt-4"><Notice error={searchParams.error} /></div>

      <form action={createAgreementAction} className="space-y-6">
        <input type="hidden" name="idempotency_key" value={randomUUID()} />

        <fieldset className="card space-y-4">
          <legend className="sr-only">Project details</legend>
          <h2 className="text-lg">Project details</h2>
          <div><label htmlFor="project_name" className="label">Project name</label><input id="project_name" name="project_name" required minLength={2} maxLength={120} className="input" /></div>
          <div><label htmlFor="client_name" className="label">Client name</label><input id="client_name" name="client_name" required maxLength={120} className="input" /></div>
          <div><label htmlFor="client_email" className="label">Client email (optional)</label><input id="client_email" name="client_email" type="email" maxLength={254} className="input" /><p className="hint">Stored for your reference. AgreedLink does not email your client.</p></div>
          <div><label htmlFor="description" className="label">Project description</label><textarea id="description" name="description" required maxLength={4000} rows={4} className="input" /></div>
          <div><label htmlFor="deliverables" className="label">Deliverables</label><textarea id="deliverables" name="deliverables" required maxLength={4000} rows={4} className="input" placeholder="For example: logo in 3 file formats, brand colour sheet" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="start_date" className="label">Start date (optional)</label><input id="start_date" name="start_date" type="date" className="input" /></div>
            <div><label htmlFor="delivery_date" className="label">Delivery date</label><input id="delivery_date" name="delivery_date" type="date" required className="input" /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="currency" className="label">Currency</label>
              <select id="currency" name="currency" defaultValue={profile.default_currency} className="input">
                {CURRENCY_CODES.map((c) => (<option key={c} value={c}>{c} - {CURRENCIES[c].label}</option>))}
              </select>
            </div>
            <div><label htmlFor="amount" className="label">Total project price</label><input id="amount" name="amount" inputMode="decimal" required placeholder="1500.00" className="input" /><p className="hint">Digits and one decimal point, for example 1,500.00</p></div>
          </div>
        </fieldset>

        <fieldset className={`card ${field}`}>
          <legend className="sr-only">Scope and revisions</legend>
          <h2 className="text-lg">Scope and revisions</h2>
          <div><label htmlFor="included_revisions" className="label">Included revisions</label><input id="included_revisions" name="included_revisions" type="number" min={0} max={50} defaultValue={2} required className="input" /></div>
          <div><label htmlFor="revision_definition" className="label">What counts as a revision</label><textarea id="revision_definition" name="revision_definition" maxLength={1000} rows={2} className="input" /></div>
          <div><label htmlFor="excluded_work" className="label">Work that is not included</label><textarea id="excluded_work" name="excluded_work" maxLength={2000} rows={2} className="input" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="additional_work_pricing" className="label">Extra work is priced</label>
              <select id="additional_work_pricing" name="additional_work_pricing" defaultValue="quote_first" className="input">
                <option value="quote_first">Quoted before it begins</option>
                <option value="hourly">Hourly</option>
                <option value="fixed_per_item">Fixed price per item</option>
              </select>
            </div>
            <div><label htmlFor="additional_work_price" className="label">Extra work price</label><input id="additional_work_price" name="additional_work_price" inputMode="decimal" className="input" /><p className="hint">Needed only for hourly or per-item pricing.</p></div>
          </div>
          <div>
            <label htmlFor="payment_terms_text" className="label">Payment terms (information only)</label>
            <textarea id="payment_terms_text" name="payment_terms_text" maxLength={2000} rows={3} className="input" />
            <p className="hint">AgreedLink records this text. It does not collect, hold, or verify any payment.</p>
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <SubmitButton>Create agreement</SubmitButton>
          <Link href="/dashboard" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
