import Link from 'next/link';
import { Download, Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

/** Records and files for one agreement: PDF download and attachments (Pro and Premium), with a plain explanation for Free. */
export async function AgreementTools({ agreementId }: { agreementId: string }) {
  const supabase = createClient();
  const { data } = await supabase.rpc('my_subscription');
  const plan = (data as { effective_plan?: string } | null)?.effective_plan ?? 'free';
  const paid = plan === 'pro' || plan === 'premium';

  return (
    <section className="card" aria-labelledby="tools-h">
      <h2 id="tools-h" className="text-lg">Records and files</h2>
      {paid ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <a href={`/dashboard/agreements/${agreementId}/pdf`} className="btn-secondary"><Download size={16} aria-hidden="true" /> Download PDF record</a>
            <Link href={`/dashboard/agreements/${agreementId}/attachments`} className="btn-secondary"><Paperclip size={16} aria-hidden="true" /> Attachments</Link>
          </div>
          <p className="text-xs text-muted">
            The PDF holds the current terms, the approval record, version history and change requests.
            It records what was agreed in AgreedLink and is not legal advice.
            Attachments are private to you and are not shown to your customer.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">PDF export and attachments are part of the Pro and Premium plans. <Link href="/dashboard/billing" className="font-semibold text-brand">See plans on Billing</Link>.</p>
      )}
    </section>
  );
}
