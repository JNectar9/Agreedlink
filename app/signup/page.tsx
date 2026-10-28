import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AuthShell } from '@/components/AuthShell';
import { AuthField } from '@/components/AuthField';
import { SubmitButton } from '@/components/SubmitButton';
import { Notice } from '@/components/Notice';
import { SetupNotice } from '@/components/SetupNotice';
import { OAuthButtons } from '@/components/OAuthButtons';
import { isSupabaseConfigured } from '@/lib/env';
import { signUpAction } from '@/app/auth/actions';

export const metadata = { title: 'Create your account' };

export default function SignUpPage({ searchParams }: { searchParams: { error?: string; name?: string; email?: string; phone?: string } }) {
  return (
    <AuthShell>
      {!isSupabaseConfigured() ? <SetupNotice /> : null}
      <Notice error={searchParams.error} />
      <form action={signUpAction} className="space-y-4">
        <AuthField icon="user" id="full_name" name="full_name" label="Full Name" autoComplete="name" required maxLength={120} defaultValue={searchParams.name?.slice(0, 120)} />
        <AuthField icon="mail" id="email" name="email" type="email" label="Email Address" autoComplete="email" required maxLength={254} defaultValue={searchParams.email?.slice(0, 254)} />
        <AuthField icon="phone" id="phone" name="phone" type="tel" label="Phone Number (optional)" autoComplete="tel" maxLength={30}
          pattern="\+[0-9\s\-().]{7,24}" title="Include the country code, for example +234..." hint="Include country code (e.g. +234...)" defaultValue={searchParams.phone?.slice(0, 30)} />
        <AuthField icon="lock" id="password" name="password" type="password" label="Password" autoComplete="new-password" required minLength={8} maxLength={72} hint="Minimum 8 characters" />
        <label className="flex items-start gap-3 text-left text-sm text-blue-100">
          <input type="checkbox" name="agree" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#1769FF]" />
          <span>I agree to the <Link href="/terms" target="_blank" rel="noopener" className="font-semibold text-white underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" rel="noopener" className="font-semibold text-white underline">Privacy Policy</Link>.</span>
        </label>
        <SubmitButton pendingText="Creating account…" className="w-full !min-h-[52px] !rounded-2xl text-base">Create Account <ArrowRight size={18} aria-hidden="true" /></SubmitButton>
      </form>
      <p className="text-sm text-white">Already have an account? <Link href="/signin" className="font-semibold text-brand underline-offset-2 hover:underline">Log in</Link></p>
      <OAuthButtons label="Or sign up with" />
    </AuthShell>
  );
}
