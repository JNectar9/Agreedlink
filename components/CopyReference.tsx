'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Shows a "Copy reference" button. Falls back to a hidden text field on browsers that block the clipboard API. */
export function CopyReference({ value }: { value: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement('textarea');
        field.value = value;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(field);
        if (!ok) throw new Error('copy failed');
      }
      setState('copied');
    } catch {
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 2500);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={copy} className="btn-primary w-full sm:w-auto">
        {state === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {state === 'copied' ? 'Copied' : 'Copy reference'}
      </button>
      <span role="status" aria-live="polite" className="text-xs text-muted">
        {state === 'copied' ? 'Reference copied.' : state === 'failed' ? 'Could not copy. Select the reference and copy it by hand.' : ''}
      </span>
    </div>
  );
}
