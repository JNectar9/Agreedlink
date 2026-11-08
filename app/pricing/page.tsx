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
  description: 'Free to start. Pro $9 per month, Premium $24 per month. Pay by card or bank transfer.'
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
  { q: 'How do I upgrade?', a: 'Open Billing and pay by card or bank transfer.' },
  { q: 'When does my plan start?', a: 'Card: once Paystack confirms the payment. Bank transfer: once an administrator verifies it.' },
  { q: 'Does it renew automatically?', a: 'No. One card payment adds one month. Pay again before it ends.' },
  { q: 'What happens when my plan ends?', a: 'You return to Free. Nothing is deleted, but above the Free limit you cannot create new agreements.' }
];

export default async function PricingPage() {
  const v = await viewer();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <header className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl">Simple pricing</h1>
          <p className="mt-3 text-muted">Start free. Upgrade when you need more active agreements. Dollar prices are references. Card checkout is charged in naira.</p>
          {v.isAdmin ? (
            <Link href="/dashboard/admin/subscriptions#settings" className="btn-secondary mt-4"><ShieldCheck size={16} aria-hidden="true" /> Update prices (admin)</Link>
          ) : null}
        </header>

        <div className="mt-8"><PricingPlans mode="public" /></div>

        <section aria-labelledby="how-paid-plans-work" className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h2 id="how-paid-plans-work" className="text-xl">Paying by bank transfer</h2>
            <p className="mt-2 text-sm text-ink">{ACTIVATION_NOTE}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink">
              {ACTIVATION_STEPS.map((s) => <li key={s}>{s}</li>)}
            </ol>
            <Link href="/dashboard/billing#request" className="btn-primary mt-5 w-full sm:w-auto">Go to Billing</Link>
          </div>
          <div className="card">
            <h2 className="text-xl">Bank transfer details</h2>
            {v.signedIn ? (
              v.instructions ? (
                <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-page p-4 text-sm text-ink">{v.instructions}</p>
              ) : (
                <p className="mt-3 rounded-xl bg-page p-4 text-sm text-muted">Details are not added yet. Contact <a href={`mailto:${v.supportEmail}`} className="font-semibold text-brand">{v.supportEmail}</a>.</p>
              )
            ) : (
              <p className="mt-3 text-sm text-muted"><Link href="/signin?next=/dashboard/billing" className="font-semibold text-brand">Log in</Link> or <Link href="/signup" className="font-semibold text-brand">create a free account</Link> to see the bank transfer details.</p>
            )}
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
