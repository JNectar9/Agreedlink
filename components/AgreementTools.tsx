import Link from 'next/link';
import { Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

/** Records and files for one agreement. Shows the PDF download for Pro and Premium, and a plain explanation for Free. */
export async function AgreementTools({ agreementId }: { agreementId: string }) {
  const supabase = createClient();
  const { data } = await supabase.rpc('my_subscription');
  const plan = (data as { effective_plan?: string } | null)?.effective_plan ?? 'free';
  const paid = plan === 'pro' || plan === 'premium';

  return (
    <section className="card" aria-labelledby="tools-h">
      <h2 id="tools-h" className="text-lg">Records and files</h2>
      <div className="mt-3 space-y-2">
        {paid ? (
          <>
            <a href={`/dashboard/agreements/${agreementId}/pdf`} className="btn-secondary w-full sm:w-auto"><Download size={16} aria-hidden="true" /> Download PDF record</a>
            <p className="text-xs text-muted">
              A PDF of the current terms, the approval record, version history and change requests.
              It records what was agreed in AgreedLink and is not legal advice.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">PDF export is part of the Pro and Premium plans. <Link href="/dashboard/billing" className="font-semibold text-brand">See plans on Billing</Link>.</p>
        )}
      </div>
    </section>
  );
}
