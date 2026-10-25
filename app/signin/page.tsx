import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { Notice } from '@/components/Notice';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/env';
import { signInAction } from '@/app/auth/actions';

export const metadata = { title: 'Sign in' };

export default function SignInPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl">Sign in to AgreedLink</h1>
        <div className="card mt-6">
          {!isSupabaseConfigured() ? <SetupNotice /> : null}
          <Notice error={searchParams.error} ok={searchParams.ok} />
          <form action={signInAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required className="input" />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
            </div>
            <SubmitButton className="w-full">Sign in</SubmitButton>
          </form>
          <p className="mt-4 text-sm"><Link href="/forgot-password" className="font-semibold text-brand">Forgot your password?</Link></p>
          <p className="mt-2 text-sm text-muted">
            New here? <Link href="/signup" className="font-semibold text-brand">Create an account</Link>
          </p>
        </div>
      </main>
    </>
  );
}
