import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import { changeStatusLabel } from '@/components/ChangeHistory';
import { describeIdentity } from '@/lib/identity';
import { formatDeltaMinor, formatMinorSafe } from '@/lib/money';
import { formatDateTime, formatPlainDate } from '@/lib/time';
import { pricingLabel, type Terms } from '@/lib/terms';
import type { DisplayStatus } from '@/lib/data';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Version = { version: number; created_at: string; approved_at: string | null; approved_by_name: string | null; auth_method: string | null; verified_email: string | null; email_matches_customer: boolean | null; terms: Terms };
type Change = { id: string; status: string; description: string; reason: string; price_delta_minor: number; new_amount_minor: number; new_delivery_date: string; created_at: string; decided_at: string | null; decided_by_name: string | null; auth_method: string | null; verified_email: string | null; email_matches_customer: boolean | null };

export default async function PortalAgreementPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const supabase = createClient();
  const { data } = await supabase.rpc('portal_agreement', { p_agreement: params.id });
  if (!data) notFound();
  const { data: profile } = await supabase.from('profiles').select('timezone').maybeSingle();
  const tz = profile?.timezone ?? 'Africa/Lagos';
  const a = data as { project_name: string; status: string; currency: string; amount_minor: number; delivery_date: string; version: number; terms: Terms; versions: Version[]; changes: Change[]; business: { name: string; email: string | null; phone: string | null; website: string | null; address: string | null } };
  const open = a.changes.some((c) => c.status === 'pending' || c.status === 'clarification_requested');
  const t = a.terms;
  const contact = [a.business.email, a.business.phone, a.business.website, a.business.address].filter(Boolean).join(' · ');

  return (
    <div className="space-y-5">
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm font-medium text-brand"><ArrowLeft size={16} aria-hidden="true" /> All agreements</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h1 className="text-2xl sm:text-3xl">{a.project_name}</h1><p className="text-muted">From {a.business.name}</p>{contact ? <p className="break-words text-xs text-muted">{contact}</p> : null}</div>
        <StatusBadge status={(a.status === 'approved' && open ? 'changes_pending' : a.status) as DisplayStatus} />
      </div>

      <section className="card" aria-label="Current terms">
        <h2 className="text-lg">Current terms (version {a.version})</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="font-medium text-navy">Total price</dt><dd>{formatMinorSafe(a.amount_minor, a.currency)}</dd></div>
          <div><dt className="font-medium text-navy">Delivery date</dt><dd>{formatPlainDate(a.delivery_date)}</dd></div>
          <div><dt className="font-medium text-navy">Included revisions</dt><dd>{t.included_revisions}</dd></div>
          <div><dt className="font-medium text-navy">Extra work</dt><dd>{pricingLabel(t)}</dd></div>
          <div className="sm:col-span-2"><dt className="font-medium text-navy">Description</dt><dd className="whitespace-pre-wrap">{t.description}</dd></div>
          <div className="sm:col-span-2"><dt className="font-medium text-navy">Deliverables</dt><dd className="whitespace-pre-wrap">{t.deliverables}</dd></div>
          {t.excluded_work ? <div className="sm:col-span-2"><dt className="font-medium text-navy">Work not included</dt><dd className="whitespace-pre-wrap">{t.excluded_work}</dd></div> : null}
        </dl>
      </section>

      <section className="card" aria-label="Version history">
        <h2 className="text-lg">Version history</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {a.versions.map((v) => {
            const id = describeIdentity({ auth_method: v.auth_method, verified_email: v.verified_email, email_matches_customer: v.email_matches_customer });
            return (
              <li key={v.version} className="rounded-xl border border-line p-3">
                <p className="font-semibold text-navy">Version {v.version}: {formatMinorSafe(v.terms.amount_minor, a.currency)}, due {formatPlainDate(v.terms.delivery_date)}</p>
                <p className="text-muted">{v.approved_at ? `Approved by ${v.approved_by_name} on ${formatDateTime(v.approved_at, tz)}. ${id.label}: ${id.detail}` : 'Not approved.'}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {a.changes.length > 0 ? (
        <section className="card" aria-label="Change requests">
          <h2 className="text-lg">Change requests</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {a.changes.map((c) => (
              <li key={c.id} className="rounded-xl border border-line p-3">
                <p className="font-semibold text-navy">{changeStatusLabel(c.status)}: {c.description}</p>
                <p className="text-muted">{formatDeltaMinor(c.price_delta_minor, a.currency)} · new total {formatMinorSafe(c.new_amount_minor, a.currency)} · deadline {formatPlainDate(c.new_delivery_date)}</p>
                <p className="text-xs text-muted">Proposed {formatDateTime(c.created_at, tz)}{c.decided_at ? `. Decided by ${c.decided_by_name} on ${formatDateTime(c.decided_at, tz)}. ${describeIdentity({ auth_method: c.auth_method, verified_email: c.verified_email, email_matches_customer: c.email_matches_customer }).label}.` : ''}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-sm text-muted">To approve or reject a change, use the private link {a.business.name} sent you. This page is for viewing your records.</p>
    </div>
  );
}
