import Link from 'next/link';
import { BarChart3, Calendar, CheckCircle2, Clock, Lightbulb, Link2, Megaphone, MessageCircle, MousePointerClick, Trophy, UserCheck, Users, Wallet, DollarSign } from 'lucide-react';
import { requireAffiliate, siteBase } from '@/lib/affiliate-data';
import { conversionRate, earnedOf, moneyText, nextPayoutDate, parseReferrals, referralUrl, whatsappShare } from '@/lib/affiliate';
import { CopyButton } from '@/components/affiliate/CopyButton';
import { PerformanceChart } from '@/components/affiliate/PerformanceChart';
import { ReferralList } from '@/components/affiliate/ReferralList';

export const metadata = { title: 'Affiliate dashboard' };

const RANGES = [7, 30, 90];

export default async function AffiliateDashboard({ searchParams }: { searchParams: { days?: string } }) {
  const days = RANGES.includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
  const { supabase, profile, dash } = await requireAffiliate(days);
  const refRes = await supabase.rpc('affiliate_referral_list', { p_limit: 5 });
  const recent = parseReferrals(refRes.data);
  const cur = profile.default_currency;
  const link = referralUrl(dash.code, siteBase());
  const next = nextPayoutDate();
  const sum = (k: 'clicks' | 'registrations') => dash.series.reduce((a, p) => a + p[k], 0);
  const first = (dash.name || profile.display_name || 'there').split(' ')[0];
  const suspended = dash.status === 'suspended';

  const kpis = [
    { label: 'Total Clicks', value: String(dash.clicks), sub: `Last ${days} days: ${sum('clicks')}`, Icon: MousePointerClick, tile: 'bg-brand-soft text-brand' },
    { label: 'Total Registrations', value: String(dash.registrations), sub: `Last ${days} days: ${sum('registrations')}`, Icon: Users, tile: 'bg-brand-soft text-brand' },
    { label: 'Paying Customers', value: String(dash.paying), sub: `Conversion: ${conversionRate(dash.paying, dash.clicks)}`, Icon: DollarSign, tile: 'bg-purple-100 text-purple-600' },
    { label: 'Total Commissions', value: moneyText(dash.totals, earnedOf, cur), sub: 'Pending, approved and paid', Icon: Trophy, tile: 'bg-ok-bg text-ok' }
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Welcome back, {first}! <span aria-hidden="true">&#128075;</span></h1>
          <p className="mt-1 text-muted">Track your referrals, earnings and payouts all in one place.</p>
        </div>
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white" aria-hidden="true">{first.charAt(0).toUpperCase()}</span>
          <div className="text-sm"><p className="font-semibold text-navy">{dash.name}</p><p className="text-muted">Affiliate Partner</p></div>
        </div>
      </div>

      {suspended ? (
        <p role="status" className="rounded-xl border border-warn/30 bg-warn-bg p-3 text-sm text-warn">
          Your affiliate account is suspended. Your link is off and new referrals do not earn commissions. Earlier records stay here.
          {dash.reviewNote ? ` Note: ${dash.reviewNote}` : ''}
        </p>
      ) : null}

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {kpis.map(({ label, value, sub, Icon, tile }) => (
          <div key={label} className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tile}`} aria-hidden="true"><Icon size={22} /></span>
              <p className="text-sm text-ink">{label}</p>
            </div>
            <p className="mt-2 break-words text-2xl font-bold text-navy sm:text-3xl">{value}</p>
            <p className="text-xs text-muted">{sub}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {!suspended ? (
          <section aria-label="Your referral link" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-brand p-5 text-white">
            <Megaphone size={110} className="absolute -right-4 bottom-0 hidden text-white/15 sm:block" aria-hidden="true" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand" aria-hidden="true"><Link2 size={24} /></span>
              <h2 className="text-xl font-bold text-white">Your Referral Link</h2>
            </div>
            <div className="relative mt-3 flex items-center gap-2 rounded-xl bg-white p-1.5 pl-3">
              <span className="min-w-0 flex-1 truncate text-sm text-ink" title={link}>{link}</span>
              <CopyButton text={link} />
            </div>
            <div className="relative mt-3 flex flex-wrap gap-2">
              <a href={whatsappShare(link)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white">
                <MessageCircle size={18} aria-hidden="true" /> Share on WhatsApp</a>
              <Link href="/affiliate/help" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/60 px-4 text-sm font-semibold text-white">View Sharing Guide</Link>
            </div>
          </section>
        ) : <div className="hidden lg:block" />}

        <section aria-label="Next payment" className="rounded-2xl border border-green-100 bg-green-50 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700" aria-hidden="true"><Calendar size={24} /></span>
            <div><h2 className="text-base font-bold text-navy">Next Affiliate Payment</h2><p className="text-2xl font-bold text-navy">{next.label}</p></div>
          </div>
          <p className="mt-3 text-sm text-ink">Includes eligible commissions from {next.includes}.</p>
          <p className="mt-2 rounded-lg bg-white/70 p-2 text-sm text-ink">Paid after admin review. Commissions under 7 days old roll over.</p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section aria-label="Your performance" className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy"><BarChart3 size={20} className="text-brand" aria-hidden="true" /> Your Performance</h2>
            <div className="flex gap-1 text-sm" role="group" aria-label="Range">
              {RANGES.map((d) => (
                <Link key={d} href={d === 30 ? '/affiliate' : `/affiliate?days=${d}`} aria-current={d === days ? 'true' : undefined}
                  className={`rounded-full px-3 py-1.5 font-medium ${d === days ? 'bg-brand text-white' : 'border border-line text-navy'}`}>{d} days</Link>
              ))}
            </div>
          </div>
          <div className="mt-3"><PerformanceChart points={dash.series} /></div>
        </section>

        <section aria-label="Earnings summary" className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy"><Wallet size={20} className="text-brand" aria-hidden="true" /> Earnings Summary</h2>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
              <Clock size={18} className="text-warn" aria-hidden="true" /> Pending Commissions</span>
              <strong className="text-right text-navy">{moneyText(dash.totals, (t) => t.pendingMinor, cur)}</strong>
              </li>
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-ok" aria-hidden="true" /> Approved Commissions</span>
              <strong className="text-right text-navy">{moneyText(dash.totals, (t) => t.approvedMinor, cur)}</strong>
              </li>
            <li className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
              <UserCheck size={18} className="text-muted" aria-hidden="true" /> Total Paid</span>
              <strong className="text-right text-navy">{moneyText(dash.totals, (t) => t.paidMinor, cur)}</strong>
              </li>
          </ul>
          <Link href="/affiliate/payments" className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand text-sm font-semibold text-white">View Payment History</Link>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section aria-label="Recent referrals" className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold text-navy"><Users size={20} className="text-brand" aria-hidden="true" /> Recent Referrals</h2>
            <Link href="/affiliate/referrals" className="text-sm font-semibold text-brand">View All</Link>
          </div>
          <div className="mt-2"><ReferralList rows={recent} fallbackCurrency={cur} /></div>
        </section>

        <section aria-label="Affiliate tips" className="rounded-2xl border border-brand/15 bg-brand-soft p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy"><Lightbulb size={20} className="text-brand" aria-hidden="true" /> Affiliate Tips</h2>
          <p className="mt-2 text-sm text-ink">Share your referral link on social media, in your WhatsApp status or with your clients. The more people you reach, the more chances you have to earn.</p>
          <Link href="/affiliate/help" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white">View Full Guide</Link>
        </section>
      </div>
    </div>
  );
}
