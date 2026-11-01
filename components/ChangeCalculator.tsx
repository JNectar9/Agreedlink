'use client';
import { useMemo, useState } from 'react';
import { SubmitButton } from './SubmitButton';
import { computeRevisedTotal, parsePriceDelta } from '@/lib/change-request';
import { formatDeltaMinor, formatMinorSafe } from '@/lib/money';
import { formatPlainDate } from '@/lib/time';

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  idempotencyKey: string;
  currency: string;
  originalAmountMinor: number;
  originalDeliveryDate: string;
  currentAmountMinor: number;
  currentDeliveryDate: string;
  currentRevisions: number;
  currentDeliverables: string;
  currentExcluded: string;
  currentVersion: number;
};

/** Change request form with a live cost calculator. The server recalculates the total again when it saves. */
export function ChangeCalculator(p: Props) {
  const [mode, setMode] = useState<'none' | 'add' | 'reduce'>('add');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(p.currentDeliveryDate);

  const calc = useMemo(() => {
    const delta = parsePriceDelta(mode, amount, p.currency);
    if (!delta.ok) return { error: amount.trim() === '' && mode !== 'none' ? '' : delta.error, delta: 0, total: null as number | null };
    const total = computeRevisedTotal(p.currentAmountMinor, delta.delta);
    return total.ok ? { error: '', delta: delta.delta, total: total.total } : { error: total.error, delta: delta.delta, total: null };
  }, [mode, amount, p.currency, p.currentAmountMinor]);

  const money = (m: number) => formatMinorSafe(m, p.currency);
  const showOriginal = p.currentVersion > 1;
  const modes = [
    { value: 'add', label: 'Additional cost' },
    { value: 'reduce', label: 'Price reduction' },
    { value: 'none', label: 'No price change' }
  ] as const;

  return (
    <form action={p.action} className="mt-4 space-y-4">
      <input type="hidden" name="idempotency_key" value={p.idempotencyKey} />
      <div><label htmlFor="description" className="label">What is changing</label><textarea id="description" name="description" required maxLength={2000} rows={3} className="input" /></div>
      <div><label htmlFor="reason" className="label">Reason for the change</label><textarea id="reason" name="reason" required maxLength={2000} rows={2} className="input" /></div>

      <fieldset className="rounded-xl border border-line p-3">
        <legend className="px-1 text-sm font-medium text-navy">Price change ({p.currency})</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type of price change">
          {modes.map((m) => (
            <label key={m.value} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-sm font-medium focus-within:ring-2 focus-within:ring-brand ${mode === m.value ? 'border-brand bg-brand-soft text-navy' : 'border-line bg-white text-navy'}`}>
              <input type="radio" name="price_mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="sr-only" />
              {m.label}
            </label>
          ))}
        </div>
        {mode !== 'none' ? (
          <div className="mt-3">
            <label htmlFor="price_amount" className="label">{mode === 'add' ? 'Amount to add' : 'Amount to take off'}</label>
            <input id="price_amount" name="price_amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="input" />
            <p className="hint">Digits and one decimal point, for example 250.00. Enter the change only, not the new total.</p>
          </div>
        ) : null}
      </fieldset>

      <div className="rounded-xl bg-brand-soft p-4 text-sm" aria-live="polite">
        <p className="font-semibold text-navy">Cost calculator</p>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
          {showOriginal ? (<><dt className="text-muted">Original price</dt><dd className="text-right">{money(p.originalAmountMinor)}</dd></>) : null}
          <dt className="text-muted">Current approved price</dt><dd className="text-right">{money(p.currentAmountMinor)}</dd>
          <dt className="text-muted">{mode === 'reduce' ? 'Price reduction' : mode === 'add' ? 'Additional cost' : 'Price change'}</dt>
          <dd className="text-right">{calc.total !== null ? formatDeltaMinor(calc.delta, p.currency) : 'Enter an amount'}</dd>
          <dt className="font-semibold text-navy">Revised total</dt>
          <dd className="text-right font-semibold text-navy">{calc.total !== null ? money(calc.total) : '-'}</dd>
          {showOriginal ? (<><dt className="text-muted">Original deadline</dt><dd className="text-right">{formatPlainDate(p.originalDeliveryDate)}</dd></>) : null}
          <dt className="text-muted">Current deadline</dt><dd className="text-right">{formatPlainDate(p.currentDeliveryDate)}</dd>
          <dt className="font-semibold text-navy">Revised deadline</dt><dd className="text-right font-semibold text-navy">{/^\d{4}-\d{2}-\d{2}$/.test(date) ? formatPlainDate(date) : '-'}</dd>
        </dl>
        {calc.error ? <p role="alert" className="mt-2 text-bad">{calc.error}</p> : null}
        <p className="mt-2 text-xs text-muted">The server recalculates the revised total when you save, so it always matches the approved price at that moment.</p>
      </div>

      <div><label htmlFor="new_delivery_date" className="label">Revised deadline</label><input id="new_delivery_date" name="new_delivery_date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="input" /></div>
      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold text-brand">Also change scope or revisions (optional)</summary>
        <div className="mt-3 space-y-4">
          <div><label htmlFor="new_included_revisions" className="label">Included revisions</label><input id="new_included_revisions" name="new_included_revisions" type="number" min={0} max={50} defaultValue={p.currentRevisions} className="input" /></div>
          <div><label htmlFor="deliverables" className="label">Deliverables after the change</label><textarea id="deliverables" name="deliverables" required maxLength={4000} rows={4} defaultValue={p.currentDeliverables} className="input" /></div>
          <div><label htmlFor="excluded_work" className="label">Work not included after the change</label><textarea id="excluded_work" name="excluded_work" maxLength={2000} rows={2} defaultValue={p.currentExcluded} className="input" /></div>
        </div>
      </details>
      <div><label htmlFor="notes_for_customer" className="label">Note for the customer (optional)</label><textarea id="notes_for_customer" name="notes_for_customer" maxLength={2000} rows={2} className="input" /></div>
      <p className="text-sm text-muted">Nothing changes until the customer approves. The current terms stay in force until then.</p>
      <SubmitButton pendingText="Saving proposal…">Save proposal</SubmitButton>
    </form>
  );
}
