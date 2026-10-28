import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { AuthField } from '@/components/AuthField';
import { SubmitButton } from '@/components/SubmitButton';
import { Notice } from '@/components/Notice';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/env';
import { forgotPasswordAction } from '@/app/auth/actions';

export const metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  return (
    <AuthShell subtitle="Enter your email and we will send you a link to choose a new password.">
      {!isSupabaseConfigured() ? <SetupNotice /> : null}
      <Notice error={searchParams.error} ok={searchParams.ok} />
      <form action={forgotPasswordAction} className="space-y-4">
        <AuthField icon="mail" id="email" name="email" type="email" label="Email Address" autoComplete="email" required />
        <SubmitButton pendingText="Sending…" className="w-full !min-h-[52px] !rounded-2xl text-base">Send reset link</SubmitButton>
      </form>
      <p className="text-sm"><Link href="/signin" className="font-semibold text-white underline-offset-2 hover:underline">Back to log in</Link></p>
    </AuthShell>
  );
}
