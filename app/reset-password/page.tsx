import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Notice } from '@/components/Notice';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { resetPasswordAction } from '@/app/auth/actions';

export const metadata = { title: 'Choose a new password' };
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const configured = isSupabaseConfigured();
  const user = configured ? (await createClient().auth.getUser()).data.user : null;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl">Choose a new password</h1>
        <div className="card mt-6">
          {!configured ? <SetupNotice /> : null}
          <Notice error={searchParams.error} />
          {user ? (
            <form action={resetPasswordAction} className="space-y-4">
              <div>
                <label htmlFor="password" className="label">New password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="input" />
                <p className="hint">At least 8 characters.</p>
              </div>
              <div>
                <label htmlFor="confirm" className="label">Confirm new password</label>
                <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="input" />
              </div>
              <SubmitButton className="w-full">Change password</SubmitButton>
            </form>
          ) : (
            <p className="text-sm text-muted">This page works only from the link in your reset email, opened in the same browser. <Link href="/forgot-password" className="font-semibold text-brand">Request a new link</Link>.</p>
          )}
        </div>
      </main>
    </>
  );
}
