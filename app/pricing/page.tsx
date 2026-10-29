import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { PricingCards } from '@/components/PricingCards';
import { Faq } from '@/components/Faq';
import { PRICING_CURRENCIES } from '@/lib/plans';
import { currencySymbol } from '@/lib/money';

export const metadata = { title: 'Pricing' };

export default function PricingPage({ searchParams }: { searchParams: { currency?: string } }) {
  const asked = (searchParams.currency ?? '').trim().toUpperCase();
  const currency = PRICING_CURRENCIES.includes(asked) ? asked : 'USD';
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl">Simple pricing</h1>
        <p className="mt-3 max-w-2xl text-muted">Start free. Pro is $9 per month and Premium is $24 per month. Naira amounts are approximate and depend on the exchange rate. Online payment through Paystack is planned but not connected yet, so nobody can be charged today, and features marked coming soon are not built yet.</p>
        <form method="get" className="mt-6 flex flex-wrap items-end gap-2" aria-label="Choose the currency for displayed prices">
          <div className="min-w-0">
            <label htmlFor="currency" className="label">Show prices in</label>
            <select id="currency" name="currency" defaultValue={currency} className="input">
              {PRICING_CURRENCIES.map((c) => (<option key={c} value={c}>{c} ({currencySymbol(c)})</option>))}
            </select>
          </div>
          <button className="btn-secondary shrink-0">Update prices</button>
        </form>
        <div className="mt-6"><PricingCards currency={currency} /></div>
        <h2 className="mt-14 text-2xl">Questions</h2>
        <div className="mt-4"><Faq limit={7} /></div>
        <p className="mt-6 text-sm text-muted">More questions? <Link href="/contact" className="font-semibold text-brand">Contact us</Link>.</p>
      </main>
      <SiteFooter />
    </>
  );
}
