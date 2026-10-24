import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, History, MessageSquare, RefreshCw, ShieldOff } from 'lucide-react';
import { requireSession, displayStatus, OPEN_CHANGE, type AgreementRow, type ChangeRow } from '@/lib/data';
import { customerUrl } from '@/lib/links';
import { compareTerms, priceDifference, pricingLabel, type Terms } from '@/lib/terms';
import { formatMinorSafe, minorToInputString, isCurrencyCode } from '@/lib/money';
import { formatDateTime, formatPlainDate } from '@/lib/time';
import { en } from '@/messages/en';
import { StatusBadge } from '@/components/StatusBadge';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { ShareButtons } from '@/components/ShareButtons';
import { ComparisonTable } from '@/components/ComparisonTable';
import {
  completeAgreementAction, proposeChangeAction, regenerateLinkAction, revokeLinkAction, withdrawChangeAction
} from '../../actions';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type EventRow = { id: number; event_type: string; actor_name: string | null; source_label: string; message: string | null; version_number: number | null; created_at: string };
type MessageRow = { id: string; body: string; author_name: string; created_at: string };

export default async function AgreementPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  if (!UUID.test(params.id)) notFound();
  const { supabase, profile } = await requireSession();
  const { data: row } = await supabase.from('agreements').select('*').eq('id', params.id).maybeSingle();
  if (!row) notFound();
  const a = row as AgreementRow;

  const [versionsRes, changesRes, eventsRes, linkRes, approvalsRes, messagesRes] = await Promise.all([
    supabase.from('agreement_versions').select('version_number, terms').eq('agreement_id', a.id),
    supabase.from('change_requests').select('*').eq('agreement_id', a.id).order('created_at', { ascending: false }),
    supabase.from('agreement_events').select('*').eq('agreement_id', a.id).order('id', { ascending: false }),
    supabase.from('share_links').select('*').eq('agreement_id', a.id).is('revoked_at', null).maybeSingle(),
    supabase.from('version_approvals').select('*').eq('agreement_id', a.id),
    supabase.from('customer_messages').select('*').eq('agreement_id', a.id).order('created_at', { ascending: false })
  ]);

  const current = (versionsRes.data ?? []).find((v) => v.version_number === a.current_version)?.terms as Terms | undefined;
  if (!current) notFound();
  const changes = (changesRes.data ?? []) as ChangeRow[];
  const open = changes.find((c) => OPEN_CHANGE.includes(c.status));
  const events = (eventsRes.data ?? []) as EventRow[];
  const messages = (messagesRes.data ?? []) as MessageRow[];
  const approval = (approvalsRes.data ?? []).find((p) => p.version_number === a.current_version);
  const link = linkRes.data;
  const built = link ? customerUrl(link.token_ciphertext) : null;
  const tz = profile.timezone;
  const shown = displayStatus(a.status, Boolean(open));
  const creatorName = profile.business_name || profile.display_name || 'I';
  const money = (m: number) => formatMinorSafe(m, a.currency);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-brand"><ArrowLeft size={16} aria-hidden="true" /> All agreements</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl">{a.project_name}</h1>
          <p className="text-muted">For {a.client_name}</p>
        </div>
        <StatusBadge status={shown} />
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />

      <section className="card" aria-labelledby="terms-h">
        <h2 id="terms-h" className="text-lg">Current terms (version {a.current_version})</h2>
        <p className="mt-1 text-sm text-muted">
          {approval
            ? `Approved by the name entered by the customer: ${approval.approved_by_name}, on ${formatDateTime(approval.approved_at, tz)}. Identity is not verified.`
            : a.status === 'awaiting_approval' ? 'Waiting for the customer to approve this version.' : 'This version has no recorded approval.'}
        </p>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="font-medium text-navy">Total price</dt><dd>{money(a.current_amount_minor)}{a.current_amount_minor !== a.original_amount_minor ? ` (originally ${money(a.original_amount_minor)})` : ''}</dd></div>
          <div><dt className="font-medium text-navy">Delivery date</dt><dd>{formatPlainDate(a.current_delivery_date)}</dd></div>
          <div><dt className="font-medium text-navy">Included revisions</dt><dd>{current.included_revisions}{current.revision_definition ? ` - ${current.revision_definition}` : ''}</dd></div>
          <div><dt className="font-medium text-navy">Extra work</dt><dd>{pricingLabel(current)}</dd></div>
          <div className="sm:col-span-2"><dt className="font-medium text-navy">Description</dt><dd className="whitespace-pre-wrap">{current.description}</dd></div>
          <div className="sm:col-span-2"><dt className="font-medium text-navy">Deliverables</dt><dd className="whitespace-pre-wrap">{current.deliverables}</dd></div>
          {current.excluded_work ? <div className="sm:col-span-2"><dt className="font-medium text-navy">Work not included</dt><dd className="whitespace-pre-wrap">{current.excluded_work}</dd></div> : null}
          {current.payment_terms_text ? <div className="sm:col-span-2"><dt className="font-medium text-navy">Payment terms (information only)</dt><dd className="whitespace-pre-wrap">{current.payment_terms_text}</dd></div> : null}
        </dl>
      </section>

      <section className="card" aria-labelledby="share-h">
        <h2 id="share-h" className="text-lg">Customer link</h2>
        {link && built ? (
          <div className="mt-3 space-y-4">
            <ShareButtons url={built.url} subject={en.share.subject(a.project_name)} defaultMessage={en.share.body(creatorName, a.project_name, built.url)} />
            <p className="text-sm text-muted">
              {link.first_opened_at
                ? `Link opened: first on ${formatDateTime(link.first_opened_at, tz)}, most recently on ${formatDateTime(link.last_opened_at!, tz)} (${link.open_count} time${link.open_count === 1 ? '' : 's'}). An open does not prove the customer read or understood the agreement.`
                : 'No open recorded yet.'}
              {link.expires_at ? ` The link expires on ${formatDateTime(link.expires_at, tz)}.` : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <a className="btn-secondary" href={`/a/${built.token}?preview=1`} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" /> Preview as customer</a>
              <form action={regenerateLinkAction.bind(null, a.id)}><SubmitButton variant="secondary"><RefreshCw size={16} aria-hidden="true" /> New link</SubmitButton></form>
              <form action={revokeLinkAction.bind(null, a.id)}><SubmitButton variant="danger"><ShieldOff size={16} aria-hidden="true" /> Revoke link</SubmitButton></form>
            </div>
            <p className="text-xs text-muted">Creating a new link or revoking it stops the old link from working immediately.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted">{link ? 'The link could not be shown. Check SHARE_TOKEN_SECRET, or create a new link.' : 'There is no active customer link.'}</p>
            <form action={regenerateLinkAction.bind(null, a.id)}><SubmitButton>Create a new link</SubmitButton></form>
          </div>
        )}
      </section>

      {a.status === 'approved' ? (
        <section className="card" aria-labelledby="change-h">
          <h2 id="change-h" className="text-lg">Changes</h2>
          {open ? (
            <div className="mt-3 space-y-4">
              <p className="text-sm"><span className="font-semibold text-navy">{open.status === 'clarification_requested' ? 'The customer asked for clarification.' : 'Waiting for the customer.'}</span> {open.description}</p>
              <ComparisonTable rows={compareTerms(current, open.proposed_terms)} difference={priceDifference(current, open.proposed_terms)} />
              <form action={withdrawChangeAction.bind(null, a.id, open.id)}><SubmitButton variant="secondary">Withdraw this proposal</SubmitButton></form>
              {open.status === 'clarification_requested' ? <p className="text-sm text-muted">To answer, submit a revised proposal below. It replaces this one.</p> : null}
            </div>
          ) : null}
          {(!open || open.status === 'clarification_requested') ? (
            <details className="mt-4 rounded-xl border border-line p-4">
              <summary className="cursor-pointer text-sm font-semibold text-brand">{open ? 'Send a revised proposal' : 'Propose a change'}</summary>
              <form action={proposeChangeAction.bind(null, a.id)} className="mt-4 space-y-4">
                <div><label htmlFor="description" className="label">What is changing</label><textarea id="description" name="description" required maxLength={2000} rows={3} className="input" /></div>
                <div><label htmlFor="reason" className="label">Reason for the change</label><textarea id="reason" name="reason" required maxLength={2000} rows={2} className="input" /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label htmlFor="new_amount" className="label">Revised total price ({a.currency})</label><input id="new_amount" name="new_amount" inputMode="decimal" required defaultValue={isCurrencyCode(a.currency) ? minorToInputString(a.current_amount_minor, a.currency) : ''} className="input" /></div>
                  <div><label htmlFor="new_delivery_date" className="label">Revised delivery date</label><input id="new_delivery_date" name="new_delivery_date" type="date" required defaultValue={a.current_delivery_date} className="input" /></div>
                </div>
                <div><label htmlFor="new_included_revisions" className="label">Included revisions</label><input id="new_included_revisions" name="new_included_revisions" type="number" min={0} max={50} required defaultValue={current.included_revisions} className="input" /></div>
                <div><label htmlFor="deliverables" className="label">Deliverables after the change</label><textarea id="deliverables" name="deliverables" required maxLength={4000} rows={4} defaultValue={current.deliverables} className="input" /></div>
                <div><label htmlFor="excluded_work" className="label">Work not included after the change</label><textarea id="excluded_work" name="excluded_work" maxLength={2000} rows={2} defaultValue={current.excluded_work} className="input" /></div>
                <div><label htmlFor="notes_for_customer" className="label">Note for the customer (optional)</label><textarea id="notes_for_customer" name="notes_for_customer" maxLength={2000} rows={2} className="input" /></div>
                <p className="text-sm text-muted">Nothing changes until the customer approves. The current terms stay in force until then.</p>
                <SubmitButton>Save proposal</SubmitButton>
              </form>
            </details>
          ) : null}
          {changes.filter((c) => !OPEN_CHANGE.includes(c.status)).length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-navy">Earlier proposals</h3>
              <ul className="mt-2 divide-y divide-line text-sm">
                {changes.filter((c) => !OPEN_CHANGE.includes(c.status)).map((c) => (
                  <li key={c.id} className="py-3">
                    <p className="font-medium">{c.description}</p>
                    <p className="text-muted">{c.status.replace('_', ' ')}{c.decided_by_name ? ` by ${c.decided_by_name}` : ''}{c.decided_at ? ` on ${formatDateTime(c.decided_at, tz)}` : ''}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {a.status === 'approved' && !open ? (
        <section className="card" aria-labelledby="complete-h">
          <h2 id="complete-h" className="text-lg">Finish the project</h2>
          <p className="mt-1 text-sm text-muted">Marking the work complete is recorded as reported by you. It does not claim the customer confirmed receipt.</p>
          <form action={completeAgreementAction.bind(null, a.id)} className="mt-3"><SubmitButton variant="secondary">Mark as completed</SubmitButton></form>
        </section>
      ) : null}

      {messages.length > 0 ? (
        <section className="card" aria-labelledby="msg-h">
          <h2 id="msg-h" className="flex items-center gap-2 text-lg"><MessageSquare size={18} aria-hidden="true" /> Customer messages</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {messages.map((m) => (
              <li key={m.id} className="py-3"><p className="whitespace-pre-wrap">{m.body}</p><p className="text-xs text-muted">{m.author_name} (name entered by customer) · {formatDateTime(m.created_at, tz)}</p></li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card" aria-labelledby="hist-h">
        <h2 id="hist-h" className="flex items-center gap-2 text-lg"><History size={18} aria-hidden="true" /> History</h2>
        <p className="mt-1 text-sm text-muted">History is append-only. Times are shown in {tz} and stored in UTC.</p>
        <ol className="mt-4 space-y-4 border-l-2 border-line pl-4">
          {events.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-semibold text-navy">{en.events[e.event_type] ?? e.event_type}{e.version_number ? ` (version ${e.version_number})` : ''}</p>
              {e.message ? <p className="whitespace-pre-wrap text-muted">{e.message}</p> : null}
              <p className="text-xs text-muted">{e.actor_name ? `${e.actor_name} · ` : ''}{en.sources[e.source_label] ?? e.source_label} · {formatDateTime(e.created_at, tz)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
