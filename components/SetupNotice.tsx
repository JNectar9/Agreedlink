import { AlertTriangle } from 'lucide-react';

export function SetupNotice() {
  return (
    <div role="alert" className="mb-6 rounded-xl border border-warn/30 bg-warn-bg p-4 text-sm text-warn">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={18} aria-hidden="true" /> Setup required</p>
      <p className="mt-1">
        Supabase is not configured, so accounts and agreements are unavailable. Copy <code>.env.example</code> to{' '}
        <code>.env.local</code>, fill in your Supabase values, and restart the dev server. See the README for steps.
      </p>
    </div>
  );
}
