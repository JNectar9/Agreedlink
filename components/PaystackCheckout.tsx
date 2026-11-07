import { CreditCard } from 'lucide-react';
import { SubmitButton } from '@/components/SubmitButton';
import { startPaystackCheckoutAction } from '@/app/dashboard/billing/paystack/actions';
import { formatNgn } from '@/lib/paystack-checkout';
import { planLabel, usdShort } from '@/lib/subscriptions';

type Props = {
  ngnPrices: { pro: number; premium: number };
  usdPrices: { pro: number; premium: number };
  preselect: 'pro' | 'premium';
  /** An active manual (bank transfer or complimentary) plan blocks card checkout until it ends. */
  blockedByManual: boolean;
  /** The plan currently running on Paystack, if any. Switching tiers is blocked until it ends. */
  activePaystackPlan: 'pro' | 'premium' | null;
};

export function PaystackCheckout({ ngnPrices, usdPrices, preselect, blockedByManual, activePaystackPlan }: Props) {
  const disabled = blockedByManual;
  return (
    <section id="card" aria-label="Pay by card" className="card space-y-3">
      <h2 className="flex items-center gap-2 text-lg"><CreditCard size={18} aria-hidden="true" /> Pay by card (Paystack)</h2>
      <p className="rounded-xl border border-brand/20 bg-brand-soft p-3 text-sm text-navy">
        Card checkout is charged in Nigerian naira (NGN). The dollar prices on this page are a reference, and the naira amounts are not exact currency conversions.
        Eligible debit and credit cards work, including international Visa and Mastercard where your card issuer allows. You pay on Paystack&apos;s secure page and your plan changes only after Paystack confirms the payment.
      </p>
      {blockedByManual ? (
        <p role="status" className="rounded-lg border border-warn/30 bg-warn-bg p-3 text-sm text-warn">
          You already have an active plan paid by bank transfer. Card payment opens when it ends.
        </p>
      ) : null}
      {activePaystackPlan ? (
        <p className="text-xs text-muted">Your {planLabel(activePaystackPlan)} plan is paid by card. Paying again for the same plan adds one month after the current one ends.</p>
      ) : null}
      <form action={startPaystackCheckoutAction} className="space-y-4">
        <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
          <div>
            <label htmlFor="card_plan" className="label">Plan (1 month)</label>
            <select id="card_plan" name="plan" defaultValue={preselect} className="input">
              <option value="pro">Pro: {formatNgn(ngnPrices.pro)} per month ({usdShort(usdPrices.pro)} reference)</option>
              <option value="premium">Premium: {formatNgn(ngnPrices.premium)} per month ({usdShort(usdPrices.premium)} reference)</option>
            </select>
            <p className="hint">One payment adds one month. To renew, pay again before it ends. The amount is set by the server, not by this page.</p>
          </div>
          <SubmitButton pendingText="Opening Paystack..." className="w-full">Pay with Paystack</SubmitButton>
        </fieldset>
      </form>
    </section>
  );
}
