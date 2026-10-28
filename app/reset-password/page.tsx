import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { AuthField } from '@/components/AuthField';
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
    <AuthShell subtitle="Choose a new password for your account.">
      {!configured ? <SetupNotice /> : null}
      <Notice error={searchParams.error} />
      {user ? (
        <form action={resetPasswordAction} className="space-y-4">
          <AuthField icon="lock" id="password" name="password" type="password" label="New password" autoComplete="new-password" required minLength={8} maxLength={72} hint="Minimum 8 characters" />
          <AuthField icon="lock" id="confirm" name="confirm" type="password" label="Confirm new password" autoComplete="new-password" required minLength={8} maxLength={72} />
          <SubmitButton pendingText="Saving…" className="w-full !min-h-[52px] !rounded-2xl text-base">Change password</SubmitButton>
        </form>
      ) : (
        <p className="text-sm text-blue-100">This page works only from the link in your reset email, opened in the same browser. <Link href="/forgot-password" className="font-semibold text-white underline">Request a new link</Link>.</p>
      )}
    </AuthShell>
  );
}
