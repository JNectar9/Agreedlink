import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Notice } from '@/components/Notice';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/env';
import { forgotPasswordAction } from '@/app/auth/actions';

export const metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl">Reset your password</h1>
        <div className="card mt-6">
          {!isSupabaseConfigured() ? <SetupNotice /> : null}
          <Notice error={searchParams.error} ok={searchParams.ok} />
          <form action={forgotPasswordAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" />
              <p className="hint">We will email you a link to choose a new password.</p>
            </div>
            <SubmitButton className="w-full">Send reset link</SubmitButton>
          </form>
          <p className="mt-4 text-sm text-muted"><Link href="/signin" className="font-semibold text-brand">Back to log in</Link></p>
        </div>
      </main>
    </>
  );
}
