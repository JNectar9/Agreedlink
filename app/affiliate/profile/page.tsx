import { Clock, XCircle } from 'lucide-react';
import { loadAffiliate, siteBase } from '@/lib/affiliate-data';
import { referralUrl } from '@/lib/affiliate';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { ClearNoticeParams } from '@/components/ClearNoticeParams';
import { CopyButton } from '@/components/affiliate/CopyButton';
import { applyAction } from '../actions';

export const metadata = { title: 'Affiliate profile' };

type Row = { full_name: string; email: string; whatsapp: string; platform: string; status: string; code: string | null; created_at: string };
const STATUS_TEXT: Record<string, string> = { pending: 'Under review', approved: 'Approved', rejected: 'Not approved', suspended: 'Suspended' };

export default async function AffiliateProfilePage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { supabase, profile, dash } = await loadAffiliate();
  const { data } = dash.status === 'none' ? { data: null } : await supabase.from('affiliates').select('full_name, email, whatsapp, platform, status, code, created_at').maybeSingle();
  const row = data as Row | null;
  const approved = dash.status === 'approved' || dash.status === 'suspended';

  return (
    <div className="max-w-2xl space-y-4">
      <ClearNoticeParams />
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Affiliate Profile</h1>
        <p className="mt-1 text-muted">{dash.status === 'none' ? 'Apply to earn commissions when people you refer subscribe.' : 'Your affiliate details and status.'}</p>
      </div>
      <Notice error={searchParams.error} ok={searchParams.ok} />

      {dash.status === 'none' ? (
        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6" aria-label="Apply">
          <ul className="mb-4 space-y-1 text-sm text-ink">
            <li>Month 1: 50% of the net amount received.</li>
            <li>Months 2 and 3: 20% each.</li>
            <li>Month 4 on: no commission.</li>
            <li>Paid on the 5th of each month, after review by an admin.</li>
          </ul>
          <form action={applyAction} className="space-y-4">
            <div><label htmlFor="name" className="label">Full name</label><input id="name" name="name" required minLength={2} maxLength={120} defaultValue={profile.display_name ?? ''} className="input" autoComplete="name" /></div>
            <div><label htmlFor="email" className="label">Email address</label><input id="email" name="email" type="email" required maxLength={254} className="input" autoComplete="email" /></div>
            <div>
              <label htmlFor="whatsapp" className="label">WhatsApp number</label>
              <input id="whatsapp" name="whatsapp" type="tel" required maxLength={30} className="input" autoComplete="tel" />
              <p className="hint">With country code, for example +234...</p>
              </div>
            <div>
              <label htmlFor="platform" className="label">Social media or marketing platform</label>
              <input id="platform" name="platform" required maxLength={200} className="input" placeholder="For example Instagram, YouTube or a WhatsApp group" />
              </div>
            <div><label htmlFor="reason" className="label">Why do you want to join?</label><textarea id="reason" name="reason" required minLength={10} maxLength={1000} rows={4} className="input" /></div>
            <SubmitButton pendingText="Sending..." className="w-full sm:w-auto">Send application</SubmitButton>
          </form>
        </section>
      ) : null}

      {dash.status === 'pending' ? (
        <section role="status" className="flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-bg p-4 text-sm text-warn">
          <Clock size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>Your application is under review. Your referral link and earnings appear here after an admin approves it.</p>
        </section>
      ) : null}

      {dash.status === 'rejected' ? (
        <section role="status" className="flex items-start gap-3 rounded-2xl border border-bad/30 bg-bad-bg p-4 text-sm text-bad">
          <XCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>Your application was not approved.{dash.reviewNote ? ` Reason: ${dash.reviewNote}` : ''} You can contact support if you think this is a mistake.</p>
        </section>
      ) : null}

      {row ? (
        <section className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6" aria-label="Details">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-semibold uppercase text-muted">Name</dt><dd className="break-words font-medium text-navy">{row.full_name}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-muted">Status</dt><dd className="font-medium text-navy">{STATUS_TEXT[row.status] ?? row.status}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-muted">Email</dt><dd className="break-all text-ink">{row.email}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-muted">WhatsApp</dt><dd className="text-ink">{row.whatsapp}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase text-muted">Where you share</dt><dd className="break-words text-ink">{row.platform}</dd></div>
            {approved && row.code && dash.status === 'approved' ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase text-muted">Your referral code and link</dt>
                <dd className="mt-1 flex items-center gap-2 rounded-xl border border-line p-1.5 pl-3">
                  <span className="min-w-0 flex-1 truncate text-ink">{referralUrl(row.code, siteBase())}</span>
                  <CopyButton text={referralUrl(row.code, siteBase())} />
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}
    </div>
  );
}
