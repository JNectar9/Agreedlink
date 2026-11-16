import Link from 'next/link';

export const metadata = { title: 'Affiliate help' };

export default function AffiliateHelpPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Help &amp; Support</h1>
        <p className="mt-1 text-muted">How the affiliate program works.</p>
      </div>
      {[
        { h: 'How you earn', p: ['Share your referral link. When a person opens it and signs up within 30 days, they are linked to you.', 'You earn when that person pays for Pro or Premium.'] },
        { h: 'Commission rates', p: ['Month 1: 50% of the net amount received.', 'Months 2 and 3: 20% each.', 'Month 4 on: no commission.', 'Net means after payment fees, refunds and reversals. Failed payments earn nothing.'] },
        { h: 'When you are paid',
          p: ['Payments are made on the 5th of every month.',
          'A commission must be at least 7 days old, so refunds can happen first. Newer ones roll over to the next month.',
          'An admin reviews each payment. A commission shows as Paid only after the payment is confirmed.'] },
        { h: 'Good to know', p: ['You cannot earn from your own account.', 'The first affiliate link a person opens keeps the credit for 30 days.', 'Customers show as numbers to protect their privacy.'] },
        { h: 'Sharing tips',
          p: ['Post your link on social media and in your WhatsApp status.',
          'Tell freelancers how AgreedLink records client approval with a time stamp.',
          'Send the link to clients who ask how to agree on scope and changes.'] }
      ].map((s) => (
        <section key={s.h} className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-lg font-bold text-navy">{s.h}</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-ink">{s.p.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      ))}
      <p className="text-sm text-muted">Need help? <Link href="/contact" className="font-semibold text-brand">Contact support</Link>.</p>
    </div>
  );
}
