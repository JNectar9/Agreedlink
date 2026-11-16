'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copies text. Says "Copied" only if the browser really accepted it. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2500);
  }
  return (
    <button type="button" onClick={copy} aria-live="polite"
      className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-navy px-3 text-sm font-semibold text-white hover:bg-brand">
      {state === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : label}
    </button>
  );
}
