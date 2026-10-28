import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { PricingCards } from '@/components/PricingCards';
import { Faq } from '@/components/Faq';

export const metadata = { title: 'Pricing' };

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl">Simple pricing</h1>
        <p className="mt-3 max-w-2xl text-muted">Start free. Pro is $9 per month and Premium is $24 per month. Naira amounts are approximate and depend on the exchange rate. Online payment through Paystack is planned but not connected yet, so nobody can be charged today, and features marked coming soon are not built yet.</p>
        <div className="mt-8"><PricingCards /></div>
        <h2 className="mt-14 text-2xl">Questions</h2>
        <div className="mt-4"><Faq limit={7} /></div>
        <p className="mt-6 text-sm text-muted">More questions? <Link href="/contact" className="font-semibold text-brand">Contact us</Link>.</p>
      </main>
      <SiteFooter />
    </>
  );
}
