import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, CircleAlert } from 'lucide-react';
import { requireSession, loadAgreements } from '@/lib/data';
import { customerVerification, PHONE_STATUS } from '@/lib/customers';
import { formatDateTime } from '@/lib/time';
import { AgreementRow } from '@/components/AgreementRow';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { updateCustomerAction } from '../../actions';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClientPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  if (!UUID.test(params.id)) notFound();
  const { supabase, profile } = await requireSession();
  const { data: c } = await supabase.from('customers').select('*').eq('id', params.id).maybeSingle();
  if (!c) notFound();
  const agreements = (await loadAgreements(supabase)).filter((a) => a.customer_id === c.id);
  const v = customerVerification(c);

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/dashboard/clients" className="inline-flex items-center gap-1 text-sm font-medium text-brand"><ArrowLeft size={16} aria-hidden="true" /> All clients</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 text-2xl sm:text-3xl">{c.name}</h1>
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${v.verified ? 'bg-ok-bg text-ok' : 'bg-slate-100 text-slate-700'}`}>
          {v.verified ? <BadgeCheck size={14} aria-hidden="true" /> : <CircleAlert size={14} aria-hidden="true" />} {v.label}
        </span>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />

      <section className="card text-sm" aria-label="Verification">
        <h2 className="text-lg">Contact verification</h2>
        <ul className="mt-2 space-y-1 text-muted">
          <li>Email: {v.verified ? <>verified. The customer signed in with this address after confirming it{c.email_verified_at ? ` on ${formatDateTime(c.email_verified_at, profile.timezone)}` : ''}.</> : c.email ? 'not verified. It shows as verified only after the customer creates an account with this email, confirms it, and claims their agreements.' : 'no email on record.'}</li>
          <li>Phone: {PHONE_STATUS}. Phone verification is not available yet.</li>
        </ul>
      </section>

      <form action={updateCustomerAction.bind(null, c.id)} className="card space-y-4">
        <h2 className="text-lg">Client details</h2>
        <div><label htmlFor="name" className="label">Name</label><input id="name" name="name" required maxLength={120} defaultValue={c.name} className="input" /></div>
        <div><label htmlFor="email" className="label">Email</label><input id="email" name="email" type="email" maxLength={254} defaultValue={c.email ?? ''} className="input" /><p className="hint">Changing the email removes any earlier verification.</p></div>
        <div><label htmlFor="phone" className="label">Phone</label><input id="phone" name="phone" type="tel" maxLength={30} defaultValue={c.phone} className="input" /><p className="hint">Include country code (e.g. +234...)</p></div>
        <div><label htmlFor="notes" className="label">Private notes</label><textarea id="notes" name="notes" maxLength={1000} rows={3} defaultValue={c.notes} className="input" /><p className="hint">Only you can see these notes. Customers never see them.</p></div>
        <SubmitButton pendingText="Saving…">Save client</SubmitButton>
      </form>

      <section aria-label="Agreement history" className="space-y-3">
        <h2 className="text-lg">Agreement history</h2>
        {agreements.length === 0 ? <p className="text-sm text-muted">No agreements are linked to this client yet.</p> : (
          <ul className="space-y-3">{agreements.map((a) => (<li key={a.id}><AgreementRow a={a} timeZone={profile.timezone} /></li>))}</ul>
        )}
      </section>
    </div>
  );
}
