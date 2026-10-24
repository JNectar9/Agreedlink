import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Notice } from '@/components/Notice';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/env';
import { signUpAction } from '@/app/auth/actions';

export const metadata = { title: 'Create your account' };

export default function SignUpPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl">Create your AgreedLink account</h1>
        <div className="card mt-6">
          {!isSupabaseConfigured() ? <SetupNotice /> : null}
          <Notice error={searchParams.error} />
          <form action={signUpAction} className="space-y-4">
            <div>
              <label htmlFor="display_name" className="label">Your name</label>
              <input id="display_name" name="display_name" autoComplete="name" maxLength={120} className="input" />
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className="input" />
              <p className="hint">At least 8 characters.</p>
            </div>
            <SubmitButton className="w-full">Create account</SubmitButton>
          </form>
          <p className="mt-4 text-sm text-muted">
            Already registered? <Link href="/signin" className="font-semibold text-brand">Sign in</Link>
          </p>
        </div>
      </main>
    </>
  );
}
