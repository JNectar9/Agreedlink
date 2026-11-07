import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { PricingPlans } from '@/components/PricingPlans';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { ACTIVATION_NOTE, ACTIVATION_STEPS } from '@/lib/pricing-display';
import { SITE } from '@/lib/site';

export const metadata = {
  title: 'Pricing',
  description: 'AgreedLink is free to start. Pro is $9 per month and Premium is $24 per month (US dollar reference prices). Pay by card or bank transfer. A plan is activated once the payment is confirmed.'
};

/** Signed-in visitors see the payment instructions; administrators also see the price control. Everyone else sees neither. */
async function viewer(): Promise<{ signedIn: boolean; isAdmin: boolean; instructions: string; supportEmail: string }> {
  const anonymous = { signedIn: false, isAdmin: false, instructions: '', supportEmail: SITE.email };
  if (!isSupabaseConfigured()) return anonymous;
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return anonymous;
    const [adminRes, cfgRes] = await Promise.all([supabase.rpc('is_admin'), supabase.rpc('subscription_public_config')]);
    const cfg = (cfgRes.data ?? null) as { payment_instructions?: string; support_email?: string } | null;
    return {
      signedIn: true,
      isAdmin: adminRes.data === true,
      instructions: cfg?.payment_instructions?.trim() ?? '',
      supportEmail: cfg?.support_email?.trim() || SITE.email
    };
  } catch {
    return anonymous;
  }
}

const QUESTIONS = [
  { q: 'How do I upgrade to Pro or Premium?', a: 'Sign in and open Billing. Pay by card through Paystack, or pay by bank transfer using the payment instructions and send a payment request with your payment reference. A card payment activates your plan once Paystack confirms it. For a bank transfer, an administrator verifies the payment and activates your plan.' },
  { q: 'Is my plan activated straight away?', a: 'A card payment activates your plan once Paystack confirms the payment. A bank transfer is activated manually: your plan changes only after an administrator approves your request, and you can follow its status on your Billing page.' },
  { q: 'Can I pay by card, and does my plan renew automatically?', a: 'You can pay by card through Paystack or by bank transfer. Neither method renews automatically. One card payment adds one month, and a bank transfer adds the number of months you request. Pay again before your plan ends to keep it.' },
  { q: 'Which currency are prices in?', a: 'Plan prices are shown in US dollars as a reference: Pro is $9 per month and Premium is $24 per month. Card checkout is charged in Nigerian naira (NGN) at a fixed naira price for each plan, so the naira amount is not an exact conversion of the dollar price. The exact naira checkout prices are shown on the Billing page.' },
  { q: 'What happens when my paid plan ends?', a: 'You return to Free. Your agreements and records are never deleted. If you have more active agreements than Free allows, you can keep viewing and finishing them, but you cannot create new ones until you are under the limit.' },
  { q: 'What does coming soon mean?', a: 'Those features are planned but not built yet. They are shown separately so you can see what is available today and what is not.' }
];

export default async function PricingPage() {
  const v = await viewer();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <header className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl">Simple pricing</h1>
          <p className="mt-3 text-muted">Start free. Upgrade to <strong className="text-navy">Pro for $9 per month</strong> or <strong className="text-navy">Premium for $24 per month</strong> when you need more active agreements. Prices are shown in US dollars. Card checkout is charged in Nigerian naira.</p>
          {v.isAdmin ? (
            <Link href="/dashboard/admin/subscriptions#settings" className="btn-secondary mt-4"><ShieldCheck size={16} aria-hidden="true" /> Update prices (admin)</Link>
          ) : null}
        </header>

        <div className="mt-8"><PricingPlans mode="public" /></div>

        <section aria-labelledby="how-paid-plans-work" className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h2 id="how-paid-plans-work" className="text-xl">How paid plans work</h2>
            <p className="mt-2 text-sm text-ink">{ACTIVATION_NOTE}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink">
              {ACTIVATION_STEPS.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <Link href="/dashboard/billing#request" className="btn-primary mt-5 w-full sm:w-auto">Go to Billing</Link>
          </div>
          <div className="card">
            <h2 className="text-xl">Payment instructions</h2>
            {v.signedIn ? (
              v.instructions ? (
                <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-page p-4 text-sm text-ink">{v.instructions}</p>
              ) : (
                <p className="mt-3 rounded-xl bg-page p-4 text-sm text-muted">Payment instructions have not been added yet. Contact <a href={`mailto:${v.supportEmail}`} className="font-semibold text-brand">{v.supportEmail}</a> and we will send them to you.</p>
              )
            ) : (
              <p className="mt-3 text-sm text-muted">Bank transfer instructions are shown to you on the Billing page when you request a plan. <Link href="/signin?next=/dashboard/billing" className="font-semibold text-brand">Log in</Link> or <Link href="/signup" className="font-semibold text-brand">create a free account</Link> to see them.</p>
            )}
            <p className="mt-4 text-sm text-muted">Questions about paying? <Link href="/contact" className="font-semibold text-brand">Contact us</Link>.</p>
          </div>
        </section>

        <section aria-labelledby="pricing-questions" className="mt-12">
          <h2 id="pricing-questions" className="text-2xl">Questions</h2>
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
            {QUESTIONS.map((item) => (
              <details key={item.q} className="group p-4">
                <summary className="cursor-pointer text-sm font-semibold text-navy sm:text-base">{item.q}</summary>
                <p className="mt-2 text-sm text-ink">{item.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">More questions? <Link href="/contact" className="font-semibold text-brand">Contact us</Link>.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
