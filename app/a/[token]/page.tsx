import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Calendar, CheckCircle2, Download, ExternalLink, FileText, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { ComparisonTable } from '@/components/ComparisonTable';
import { LocalTime } from '@/components/LocalTime';
import { OpenBeacon } from '@/components/OpenBeacon';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { describeIdentity } from '@/lib/identity';
import { isServerConfigured, isSupabaseConfigured } from '@/lib/env';
import { hashToken, TOKEN_PATTERN } from '@/lib/tokens';
import { compareTerms, priceDifference, pricingLabel, type Terms } from '@/lib/terms';
import { formatMinorSafe } from '@/lib/money';
import { formatPlainDate } from '@/lib/time';
import { formatBytes, typeLabel } from '@/lib/attachments';
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
  original_terms?: Terms;
  approval?: { approved_at: string; approved_by_name: string; auth_method?: string | null; verified_email?: string | null; email_matches_customer?: boolean | null } | null;
  change?: { id: string; status: string; description: string; reason: string; notes_for_customer: string; proposed_terms: Terms } | null;
};

// Small helpers kept in this file so the page needs nothing else new.
type SharedFile = { id: string; name: string; mimeType: string; sizeBytes: number };

const isImageMime = (mime: string) => ['image/png', 'image/jpeg', 'image/webp'].includes(mime);

/** One checklist item per line. Bullets and numbers at the start of a line are removed. */
function splitDeliverables(text: string | null | undefined, max = 12): string[] {
  return String(text ?? '').split(/\r?\n/).map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, '').trim()).filter(Boolean).slice(0, max);
}

/** The files the sender chose to share, from the database answer. Anything malformed is dropped. */
function parseSharedFiles(raw: unknown): SharedFile[] {
  if (!Array.isArray(raw)) return [];
  const files: SharedFile[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.name !== 'string' || !r.name) continue;
    files.push({ id: r.id, name: r.name, mimeType: typeof r.mime_type === 'string' ? r.mime_type : '', sizeBytes: typeof r.size_bytes === 'number' && r.size_bytes >= 0 ? r.size_bytes : 0 });
  }
  return files;
}

const DONE: Record<string, string> = {
  agreement_approve: 'Thank you. Your approval was recorded.',
  agreement_decline: 'Your decision to decline was recorded. The sender has been notified in the app.',
  agreement_clarify: 'Your request was sent. The sender can reply to you directly.',
  change_approve: 'Thank you. You approved the change and the new terms are now recorded.',
  change_reject: 'Your decision was recorded. The existing approved terms stay in place.',
  change_clarify: 'Your question was sent. The proposal stays open until you decide.'
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-xs font-semibold text-ok"><Lock size={12} aria-hidden="true" /> Secure link</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-2xl px-4 pb-10 text-xs text-muted">
        <p className="flex items-center justify-center gap-1.5 text-center font-medium text-ink"><ShieldCheck size={14} className="text-brand" aria-hidden="true" /> Agreement managed with AgreedLink</p>
        <p className="mt-3">AgreedLink records the agreement details and decisions entered on this page. It does not verify identities, hold payments, or guarantee legal enforceability.</p>
        <p className="mt-1">Created by JNectar</p>
      </footer>
    </div>
  );
}

function IdentityNote({ token, email }: { token: string; email: string | null }) {
  return email ? (
    <p className="rounded-xl bg-ok-bg p-3 text-sm text-ok">You are signed in as <strong>{email}</strong> (email confirmed). This will be recorded with your decision. You still type your name below.</p>
  ) : (
    <p className="rounded-xl bg-white/80 p-3 text-sm text-navy">Your decision is recorded with the name you type and the time. Your identity is not verified. <Link href={`/signin?next=/a/${token}`} className="font-semibold text-brand">Log in</Link> or <Link href="/signup" className="font-semibold text-brand">create an account</Link> to attach a confirmed email, which is optional.</p>
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

function CompactFields() {
  return (
    <div className="space-y-3">
      <div><label htmlFor="name" className="label">Your name</label><input id="name" name="name" required maxLength={120} autoComplete="name" className="input" /></div>
      <div><label htmlFor="message" className="label">Message (needed if you request changes)</label><textarea id="message" name="message" rows={2} maxLength={2000} className="input" /></div>
      <details className="rounded-xl border border-line bg-white/70 px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium text-navy">Add your email (optional)</summary>
        <div className="mt-2"><label htmlFor="email" className="label">Your email</label><input id="email" name="email" type="email" maxLength={254} autoComplete="email" className="input" /></div>
      </details>
      <p className="text-xs text-muted">Your name is recorded as typed. It is not verified.</p>
    </div>
  );
}

function Field({ label, children, wide = false, divider = false }: { label: string; children: React.ReactNode; wide?: boolean; divider?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? 'col-span-2' : ''} ${divider ? 'border-l border-line pl-4' : ''}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-base font-semibold text-navy">{children}</dd>
    </div>
  );
}

function StatusChip({ status }: { status: View['status'] }) {
  if (status === 'awaiting_approval') return <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-2.5 py-1 text-sm font-semibold text-warn"><span className="h-2 w-2 rounded-full bg-warn" aria-hidden="true" /> Awaiting approval</span>;
  if (status === 'declined') return <span className="inline-flex items-center gap-1.5 rounded-full bg-bad-bg px-2.5 py-1 text-sm font-semibold text-bad"><XCircle size={14} aria-hidden="true" /> Declined</span>;
  if (status === 'expired') return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">Expired</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-2.5 py-1 text-sm font-semibold text-ok"><CheckCircle2 size={14} aria-hidden="true" /> {status === 'completed' ? 'Approved and completed' : 'Approved'}</span>;
}

export default async function CustomerPage({ params, searchParams }: { params: { token: string }; searchParams: { error?: string; done?: string; preview?: string } }) {
  const { token } = params;
  if (!TOKEN_PATTERN.test(token)) notFound();
  if (!isServerConfigured()) {
    return <Shell><Notice error="This service is not configured yet. Please contact the sender." /></Shell>;
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('customer_get', { p_token_hash: hashToken(token) });
  if (error || !data) return <Shell><Notice error={errorCopy('default')} /></Shell>;
  const view = data as View;
  if (view.link_state !== 'ok' || !view.terms) {
    const msg = view.link_state === 'expired' ? errorCopy('expired') : errorCopy('invalid_link');
    return <Shell><div className="card"><h1 className="text-xl">This link cannot be used</h1><p className="mt-2 text-muted">{msg}</p></div></Shell>;
  }

  const t = view.terms;
  let viewerEmail: string | null = null;
  if (isSupabaseConfigured()) {
    const { data: { user } } = await createClient().auth.getUser();
    if (user?.email && user.email_confirmed_at) viewerEmail = user.email;
  }
  // Files the sender chose to share. If file sharing is not set up yet, this is simply empty and the section is not shown.
  let files: SharedFile[] = [];
  try {
    const sharedRes = await admin.rpc('customer_shared_files', { p_token_hash: hashToken(token) });
    if (!sharedRes.error) files = parseSharedFiles(sharedRes.data);
  } catch {
    files = [];
  }

  const preview = searchParams.preview === '1';
  const pendingAgreement = view.status === 'awaiting_approval';
  const money = (m: number) => formatMinorSafe(m, t.currency);
  const doneText = searchParams.done ? DONE[searchParams.done] : undefined;
  const deliverables = splitDeliverables(t.deliverables);
  const deliverablesAsParagraph = deliverables.length === 1 && deliverables[0].length > 140;
  const contact = view.business ? [view.business.email, view.business.phone, view.business.website, view.business.address].filter(Boolean).join(' · ') : '';

  return (
    <Shell>
      {!preview ? <OpenBeacon token={token} /> : <Notice info="Preview mode: the buttons are turned off and this view is not recorded as an open." />}
      <Notice error={searchParams.error} ok={doneText} />
      {doneText && !viewerEmail ? (
        <p className="rounded-xl border border-line bg-white p-3 text-sm text-muted">Want to keep every agreement you receive in one place? <Link href="/signup" className="font-semibold text-brand">Create a free account</Link> or <Link href="/signin?next=/portal" className="font-semibold text-brand">log in</Link>. Use the same email the business has for you, and confirm it.</p>
      ) : null}

      <div>
        <h1 className="text-3xl font-extrabold text-navy">Review your agreement</h1>
        <p className="mt-1 text-muted">Please review the project details{files.length > 0 ? ' and attached files' : ''} before approving.</p>
        <p className="mt-1 text-sm text-muted">{view.creator_name} asked you to review this.</p>
      </div>

      <section className="rounded-2xl border border-line bg-white p-4 shadow-sm" aria-label="Project information">
        <h2 className="flex items-center gap-2 text-lg font-bold text-navy"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand" aria-hidden="true"><FileText size={18} /></span> Project information</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
          <Field label="Project">{t.project_name}</Field>
          <Field label="Status" divider><StatusChip status={view.status} /><span className="mt-1 block text-xs font-normal text-muted">Version {view.version}</span></Field>
          <Field label="Service provider">{view.creator_name}</Field>
          <Field label="Agreed price" divider>{money(t.amount_minor)}</Field>
          <Field label="Delivery date" wide><span className="inline-flex items-center gap-2"><Calendar size={18} className="text-muted" aria-hidden="true" /> {formatPlainDate(t.delivery_date)}</span></Field>
        </dl>
        {view.approval ? <p className="mt-4 text-sm text-muted">Approved by {view.approval.approved_by_name} on <LocalTime iso={view.approval.approved_at} />. {describeIdentity(view.approval).label}: {describeIdentity(view.approval).detail}</p> : null}
        {contact ? <p className="mt-3 break-words text-sm text-muted">Contact {view.creator_name}: {contact}</p> : null}

        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-lg font-bold text-navy">Work and deliverables</h3>
          {deliverablesAsParagraph ? <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{t.deliverables}</p> : (
            <ul className="mt-3 space-y-2">
              {deliverables.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-base text-ink"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" /><span className="break-words">{item}</span></li>
              ))}
            </ul>
          )}
        </div>

        <dl className="mt-5 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2"><dt className="font-medium text-navy">Description</dt><dd className="whitespace-pre-wrap text-ink">{t.description}</dd></div>
          <div><dt className="font-medium text-navy">Included revisions</dt><dd>{t.included_revisions}</dd></div>
          <div><dt className="font-medium text-navy">Extra work</dt><dd>{pricingLabel(t)}</dd></div>
          {t.revision_definition ? <div className="sm:col-span-2"><dt className="font-medium text-navy">What counts as a revision</dt><dd className="whitespace-pre-wrap">{t.revision_definition}</dd></div> : null}
          {t.excluded_work ? <div className="sm:col-span-2"><dt className="font-medium text-navy">Work not included</dt><dd className="whitespace-pre-wrap">{t.excluded_work}</dd></div> : null}
          {t.payment_terms_text ? <div className="sm:col-span-2"><dt className="font-medium text-navy">Payment terms (information only)</dt><dd className="whitespace-pre-wrap">{t.payment_terms_text}</dd></div> : null}
        </dl>
      </section>

      {files.length > 0 ? (
        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm" aria-label="Files shared with you">
          <h2 className="text-lg font-bold text-navy">Files shared with you</h2>
          <ul className="mt-3 space-y-5">
            {files.map((f) => {
              const href = `/a/${token}/files/${f.id}`;
              return (
                <li key={f.id}>
                  {isImageMime(f.mimeType) ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="relative block overflow-hidden rounded-xl bg-page" aria-label={`Open ${f.name} full size`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={href} alt={f.name} loading="lazy" className="h-44 w-full object-cover sm:h-60" />
                      <span className="absolute right-2 top-2 rounded-full bg-ok-bg px-2.5 py-1 text-[11px] font-semibold text-ok">Shared with you</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl bg-brand-soft p-4 text-brand"><FileText size={32} aria-hidden="true" /><span className="rounded-full bg-ok-bg px-2.5 py-1 text-[11px] font-semibold text-ok">Shared with you</span></div>
                  )}
                  <p className="mt-2 break-words text-base font-bold text-navy">{f.name}</p>
                  <p className="text-xs text-muted">{typeLabel(f.mimeType)} • {formatBytes(f.sizeBytes)}</p>
                  <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-brand">
                    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">View full size file <ExternalLink size={14} aria-hidden="true" /></a>
                    <a href={`${href}?download=1`} className="inline-flex items-center gap-1"><Download size={14} aria-hidden="true" /> Download</a>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {pendingAgreement ? (
        <form action={decideAgreementAction.bind(null, token)} className="space-y-4 rounded-2xl border border-brand/20 bg-brand-soft p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-brand" aria-hidden="true"><CheckCircle2 size={24} /></span>
            <div>
              <h2 className="text-lg font-bold text-navy">Your decision</h2>
              <p className="text-sm text-muted">Please confirm whether you agree with these details. Nothing is final until you choose.</p>
            </div>
          </div>
          <input type="hidden" name="version" value={view.version} />
          <IdentityNote token={token} email={viewerEmail} />
          <CompactFields />
          {preview ? null : (
            <div className="flex flex-col gap-2">
              <SubmitButton name="decision" value="approve" className="w-full">Approve agreement</SubmitButton>
              <SubmitButton name="decision" value="clarify" variant="secondary" className="w-full !border-brand !bg-white !text-navy">Request changes</SubmitButton>
              <SubmitButton name="decision" value="decline" variant="secondary" className="w-full !bg-slate-100 !text-navy">Decline agreement</SubmitButton>
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
          <ComparisonTable rows={compareTerms(t, view.change.proposed_terms, view.original_terms)} difference={priceDifference(t, view.change.proposed_terms)} />
          <p className="text-sm text-muted">The terms above under &quot;Current approved&quot; stay in force unless you approve this change.</p>
          <form action={decideChangeAction.bind(null, token)} className="space-y-4">
            <input type="hidden" name="change_id" value={view.change.id} />
            <IdentityNote token={token} email={viewerEmail} />
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
