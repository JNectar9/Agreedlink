import { requireAffiliate } from '@/lib/affiliate-data';
import { parseReferrals } from '@/lib/affiliate';
import { ReferralList } from '@/components/affiliate/ReferralList';

export const metadata = { title: 'My referrals' };

export default async function ReferralsPage() {
  const { supabase, profile } = await requireAffiliate();
  const { data } = await supabase.rpc('affiliate_referral_list', { p_limit: 200 });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My Referrals</h1>
        <p className="mt-1 text-muted">Customers appear as numbers to protect their privacy.</p>
      </div>
      <section className="rounded-2xl border border-line bg-white p-4 shadow-sm"><ReferralList rows={parseReferrals(data)} fallbackCurrency={profile.default_currency} /></section>
    </div>
  );
}
