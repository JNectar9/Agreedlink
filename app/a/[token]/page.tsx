import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { ComparisonTable } from '@/components/ComparisonTable';
import { LocalTime } from '@/components/LocalTime';
import { OpenBeacon } from '@/components/OpenBeacon';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServerConfigured } from '@/lib/env';
import { hashToken, TOKEN_PATTERN } from '@/lib/tokens';
import { compareTerms, priceDifference, pricingLabel, type Terms } from '@/lib/terms';
import { formatMinorSafe } from '@/lib/money';
import { formatPlainDate } from '@/lib/time';
import { errorCopy } from '@/messages/en';
import { decideAgreementAction, decideChangeAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Review agreement', robots: { index: false, follow: false }, referrer: 'no-referrer' };

type View = {
  link_state: 'ok' | 'invalid' | 'revoked' | 'expired';
  creator_name?: string;
  business?: { email?: string | null; phone?: string | null; website?: string | null; address?: string | null } | null;
  status?: 'awaiting_approval' | 'approved' | 'declined' | 'completed' | 'expired' | 'draft';
  version?: number;
  terms?: Terms;
  approval?: { approved_at: string; approved_by_name: string } | null;
  change?: { id: string; status: string; description: string; reason: string; notes_for_customer: string; proposed_terms: Terms } | null;
};

const DONE: Record<string, string> = {
  agreement_approve: 'Thank you. Your approval was recorded.',
  agreement_decline: 'Your decision to decline was recorded. The sender has been notified in the app.',
  agreement_clarify: 'Your question was sent. The sender can reply to you directly.',
  change_approve: 'Thank you. You approved the change and the new terms are now recorded.',
  change_reject: 'Your decision was recorded. The existing approved terms stay in place.',
  change_clarify: 'Your question was sent. The proposal stays open until you decide.'
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-white"><div className="mx-auto flex h-14 max-w-2xl items-center px-4"><Logo /></div></header>
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-2xl px-4 pb-10 text-xs text-muted">
        <p>AgreedLink records the agreement details and decisions entered on this page. It does not verify identities, hold payments, or guarantee legal enforceability.</p>
        <p className="mt-1">Created by JNectar</p>
      </footer>
    </div>
  );
}

function DecisionFields({ clarifyHint }: { clarifyHint: string }) {
  return (
    <div className="space-y-3">
      <div><label htmlFor="name" className="label">Your name</label><input id="name" name="name" required maxLength={120} autoComplete="name" className="input" /><p className="hint">Recorded as the name entered by you. It is not verified.</p></div>
      <div><label htmlFor="email" className="label">Your email (optional)</label><input id="email" name="email" type="email" maxLength={254} autoComplete="email" className="input" /></div>
      <div><label htmlFor="message" className="label">Message</label><textarea id="message" name="message" rows={3} maxLength={2000} className="input" /><p className="hint">{clarifyHint}</p></div>
    </div>
  );
}

export default async function CustomerPage({ params, searchParams }: { params: { token: string }; searchParams: { error?: string; done?: string; preview?: string } }) {
  const { token } = params;
  if (!TOKEN_PATTERN.test(token)) notFound();
  if (!isServerConfigured()) {
    return <Shell><Notice error="This service is not configured yet. Please contact the sender." /></Shell>;
  }
  const { data, error } = await createAdminClient().rpc('customer_get', { p_token_hash: hashToken(token) });
  if (error || !data) return <Shell><Notice error={errorCopy('default')} /></Shell>;
  const view = data as View;
  if (view.link_state !== 'ok' || !view.terms) {
    const msg = view.link_state === 'expired' ? errorCopy('expired') : errorCopy('invalid_link');
    return <Shell><div className="card"><h1 className="text-xl">This link cannot be used</h1><p className="mt-2 text-muted">{msg}</p></div></Shell>;
  }

  const t = view.terms;
  const preview = searchParams.preview === '1';
  const pendingAgreement = view.status === 'awaiting_approval';
  const money = (m: number) => formatMinorSafe(m, t.currency);
  const doneText = searchParams.done ? DONE[searchParams.done] : undefined;

  return (
    <Shell>
      {!preview ? <OpenBeacon token={token} /> : <Notice info="Preview mode: the buttons are turned off and this view is not recorded as an open." />}
      <Notice error={searchParams.error} ok={doneText} />

      <div className="card space-y-4">
        <div>
          <p className="text-sm text-muted">{view.creator_name} asked you to review</p>
          <h1 className="text-2xl">{t.project_name}</h1>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold">
            {view.status === 'awaiting_approval' ? (<span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-2.5 py-1 text-warn"><Clock size={14} aria-hidden="true" /> Waiting for your decision</span>)
              : view.status === 'declined' ? (<span className="inline-flex items-center gap-1.5 rounded-full bg-bad-bg px-2.5 py-1 text-bad"><XCircle size={14} aria-hidden="true" /> Declined</span>)
              : view.status === 'expired' ? (<span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">Expired</span>)
              : (<span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-ok"><CheckCircle2 size={14} aria-hidden="true" /> {view.status === 'completed' ? 'Approved and marked completed by the sender' : 'Approved'}</span>)}
            <span className="ml-2 text-xs font-normal text-muted">Version {view.version}</span>
          </p>
          {view.approval ? <p className="mt-2 text-sm text-muted">Approved by the name entered, {view.approval.approved_by_name}, on <LocalTime iso={view.approval.approved_at} />.</p> : null}
        </div>
        {view.business && [view.business.email, view.business.phone, view.business.website, view.business.address].some(Boolean) ? (
          <p className="text-sm text-muted">Contact {view.creator_name}: {[view.business.email, view.business.phone, view.business.website, view.business.address].filter(Boolean).join(' · ')}</p>
        ) : null}
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="font-medium text-navy">Total price</dt><dd>{money(t.amount_minor)}</dd></div>
          <div><dt className="font-medium text-navy">Delivery date</dt><dd>{formatPlainDate(t.delivery_date)}</dd></div>
          <div><dt className="font-medium text-navy">Included revisions</dt><dd>{t.included_revisions}</dd></div>
          <div><dt className="font-medium text-navy">Extra work</dt><dd>{pricingLabel(t)}</dd></div>
          <div className="sm:col-span-2"><dt className="font-medium text-navy">Description</dt><dd className="whitespace-pre-wrap">{t.description}</dd></div>
          <div className="sm:col-span-2"><dt className="font-medium text-navy">Deliverables</dt><dd className="whitespace-pre-wrap">{t.deliverables}</dd></div>
          {t.revision_definition ? <div className="sm:col-span-2"><dt className="font-medium text-navy">What counts as a revision</dt><dd className="whitespace-pre-wrap">{t.revision_definition}</dd></div> : null}
          {t.excluded_work ? <div className="sm:col-span-2"><dt className="font-medium text-navy">Work not included</dt><dd className="whitespace-pre-wrap">{t.excluded_work}</dd></div> : null}
          {t.payment_terms_text ? <div className="sm:col-span-2"><dt className="font-medium text-navy">Payment terms (information only)</dt><dd className="whitespace-pre-wrap">{t.payment_terms_text}</dd></div> : null}
        </dl>
      </div>

      {pendingAgreement ? (
        <form action={decideAgreementAction.bind(null, token)} className="card space-y-4">
          <h2 className="text-lg">Your decision</h2>
          <p className="text-sm text-muted">Read the details above, then approve, ask a question, or decline. Nothing is final until you choose.</p>
          <input type="hidden" name="version" value={view.version} />
          <DecisionFields clarifyHint="Required if you ask for clarification. Optional if you decline." />
          {preview ? null : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitButton name="decision" value="approve" className="sm:flex-1">Approve agreement</SubmitButton>
              <SubmitButton name="decision" value="clarify" variant="secondary" className="sm:flex-1">Request clarification</SubmitButton>
              <SubmitButton name="decision" value="decline" variant="danger" className="sm:flex-1">Decline agreement</SubmitButton>
            </div>
          )}
        </form>
      ) : null}

      {view.status === 'approved' && view.change ? (
        <div className="card space-y-4">
          <h2 className="text-lg">A change was proposed</h2>
          <p className="text-sm"><span className="font-medium text-navy">What is changing:</span> {view.change.description}</p>
          <p className="text-sm"><span className="font-medium text-navy">Reason:</span> {view.change.reason}</p>
          {view.change.notes_for_customer ? <p className="text-sm"><span className="font-medium text-navy">Note:</span> {view.change.notes_for_customer}</p> : null}
          <ComparisonTable rows={compareTerms(t, view.change.proposed_terms)} difference={priceDifference(t, view.change.proposed_terms)} />
          <p className="text-sm text-muted">The terms above under &quot;Current approved&quot; stay in force unless you approve this change.</p>
          <form action={decideChangeAction.bind(null, token)} className="space-y-4">
            <input type="hidden" name="change_id" value={view.change.id} />
            <DecisionFields clarifyHint="Required if you ask for clarification. Optional if you reject." />
            {preview ? null : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <SubmitButton name="decision" value="approve" className="sm:flex-1">Approve change</SubmitButton>
                <SubmitButton name="decision" value="clarify" variant="secondary" className="sm:flex-1">Request clarification</SubmitButton>
                <SubmitButton name="decision" value="reject" variant="danger" className="sm:flex-1">Reject change</SubmitButton>
              </div>
            )}
          </form>
        </div>
      ) : null}
    </Shell>
  );
}
