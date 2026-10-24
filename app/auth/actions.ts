'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, siteUrl } from '@/lib/env';

function go(path: string, kind: 'error' | 'ok', message: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData) {
  if (!isSupabaseConfigured()) go('/signin', 'error', 'Supabase is not configured yet. See the setup notice below.');
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) go('/signin', 'error', 'Enter your email and password.');
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) go('/signin', 'error', 'The email or password is incorrect, or the email address is not confirmed yet.');
  redirect('/dashboard');
}

export async function signUpAction(formData: FormData) {
  if (!isSupabaseConfigured()) go('/signup', 'error', 'Supabase is not configured yet. See the setup notice below.');
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('display_name') ?? '').trim().slice(0, 120);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) go('/signup', 'error', 'Enter a valid email address.');
  if (password.length < 8 || password.length > 72) go('/signup', 'error', 'Use a password between 8 and 72 characters.');
  const { data, error } = await createClient().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback`, data: { display_name: displayName } }
  });
  if (error) go('/signup', 'error', error.message);
  if (data.session) redirect('/dashboard');
  go('/signin', 'ok', 'Account created. Check your email to confirm your address, then sign in.');
}

export async function signOutAction() {
  if (isSupabaseConfigured()) await createClient().auth.signOut();
  redirect('/');
}
