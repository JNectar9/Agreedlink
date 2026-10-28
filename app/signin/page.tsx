import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/AuthShell';
import { AuthField } from '@/components/AuthField';
import { SubmitButton } from '@/components/SubmitButton';
import { Notice } from '@/components/Notice';
import { SetupNotice } from '@/components/SetupNotice';
import { OAuthButtons } from '@/components/OAuthButtons';
import { isSupabaseConfigured } from '@/lib/env';
import { signInAction } from '@/app/auth/actions';

export const metadata = { title: 'Log in' };

export default function SignInPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  return (
    <AuthShell subtitle="Welcome back. Log in to manage your agreements.">
      {!isSupabaseConfigured() ? <SetupNotice /> : null}
      <Notice error={searchParams.error} ok={searchParams.ok} />
      <form action={signInAction} className="space-y-4">
        <AuthField icon="mail" id="email" name="email" type="email" label="Email Address" autoComplete="email" required />
        <AuthField icon="lock" id="password" name="password" type="password" label="Password" autoComplete="current-password" required />
        <SubmitButton pendingText="Logging in…" className="w-full !min-h-[52px] !rounded-2xl text-base">Log in <ArrowRight size={18} aria-hidden="true" /></SubmitButton>
      </form>
      <p className="text-sm"><Link href="/forgot-password" className="font-semibold text-white underline-offset-2 hover:underline">Forgot your password?</Link></p>
      <p className="text-sm text-white">New here? <Link href="/signup" className="font-semibold text-brand underline-offset-2 hover:underline">Create an account</Link></p>
      <OAuthButtons label="Or log in with" />
    </AuthShell>
  );
}
