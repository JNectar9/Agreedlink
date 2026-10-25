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

export async function forgotPasswordAction(formData: FormData) {
  if (!isSupabaseConfigured()) go('/forgot-password', 'error', 'Supabase is not configured yet.');
  const email = String(formData.get('email') ?? '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) go('/forgot-password', 'error', 'Enter a valid email address.');
  const { error } = await createClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`
  });
  if (error) go('/forgot-password', 'error', 'We could not send the email right now. Please try again in a few minutes.');
  go('/forgot-password', 'ok', 'If an account exists for that email, a reset link is on its way. Check your inbox and spam folder, and open the link in this same browser.');
}

export async function resetPasswordAction(formData: FormData) {
  if (!isSupabaseConfigured()) go('/reset-password', 'error', 'Supabase is not configured yet.');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8 || password.length > 72) go('/reset-password', 'error', 'Use a password between 8 and 72 characters.');
  if (password !== confirm) go('/reset-password', 'error', 'The two passwords do not match.');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) go('/reset-password', 'error', 'Your reset link has expired. Request a new one.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) go('/reset-password', 'error', 'The password could not be changed. Request a new reset link and try again.');
  go('/dashboard', 'ok', 'Your password was changed.');
}
