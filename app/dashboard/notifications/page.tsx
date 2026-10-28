import Link from 'next/link';
import { BellOff } from 'lucide-react';
import { requireSession } from '@/lib/data';
import { formatDateTime } from '@/lib/time';
import { SubmitButton } from '@/components/SubmitButton';
import { markNotificationsReadAction } from '../actions';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const { supabase, profile } = await requireSession();
  const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  const notes = data ?? [];
  const unread = notes.filter((n) => !n.read_at).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">Notifications</h1>
        {unread > 0 ? (
          <form action={markNotificationsReadAction}>
            <input type="hidden" name="to" value="/dashboard/notifications" />
            <SubmitButton variant="secondary">Mark all as read</SubmitButton>
          </form>
        ) : null}
      </div>
      {notes.length === 0 ? (
        <div className="card text-center">
          <BellOff className="mx-auto text-brand" size={36} aria-hidden="true" />
          <p className="mt-3 font-semibold text-navy">No notifications yet</p>
          <p className="mt-1 text-sm text-muted">You will see approvals, declines, and questions from your customers here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id}>
              <Link href={n.agreement_id ? `/dashboard/agreements/${n.agreement_id}` : '/dashboard'} className={`card block !p-4 hover:border-brand ${n.read_at ? '' : 'border-brand/40 bg-brand-soft/40'}`}>
                <p className="flex items-center gap-2 font-semibold text-navy">{!n.read_at ? <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" /> : null}{n.title}</p>
                <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{formatDateTime(n.created_at, profile.timezone)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
