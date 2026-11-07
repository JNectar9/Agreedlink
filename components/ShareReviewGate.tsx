'use client';
import { useState, type ReactNode } from 'react';

/** Hides the sharing controls until the freelancer confirms they reviewed the files. This is a guard for people, not a security control. */
export function ShareReviewGate({ visibleCount, children }: { visibleCount: number; children: ReactNode }) {
  const [reviewed, setReviewed] = useState(false);
  return (
    <div className="space-y-3">
      <label className="flex min-h-[44px] items-start gap-3 rounded-xl border border-line p-3 text-sm">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
        <span className="text-navy">
          I have reviewed the files my customer will be able to see.
          {visibleCount === 0 ? <span className="block text-xs text-muted">No files will be visible to your customer.</span> : null}
        </span>
      </label>
      {reviewed ? children : <p className="text-sm text-muted" role="status">Tick the box above to get the customer link and sharing buttons.</p>}
    </div>
  );
}
