'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured, siteUrl } from '@/lib/env';
import { parseSignUpForm } from '@/lib/auth-validation';
import { isValidTimeZone } from '@/lib/time';

function go(path: string, kind: 'error' | 'ok', message: string, extra?: Record<string, string>): never {
  const params = new URLSearchParams({ [kind]: message, ...extra });
  redirect(`${path}?${params.toString()}`);
}

export async function signInAction(formData: FormData) {
  if (!isSupabaseConfigured()) go('/signin', 'error', 'Supabase is not configured yet. See the setup notice.');
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) go('/signin', 'error', 'Enter your email and password.');
  const { error } = await createClient().auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === 'email_not_confirmed') go('/signin', 'error', 'Please confirm your email address first. Check your inbox for the confirmation link.');
    go('/signin', 'error', 'The email or password is incorrect.');
  }
  redirect('/dashboard');
}

export async function signUpAction(formData: FormData) {
  const values = {
    name: String(formData.get('full_name') ?? '').slice(0, 120),
    email: String(formData.get('email') ?? '').slice(0, 254),
    phone: String(formData.get('phone') ?? '').slice(0, 30)
  };
  const fail: (message: string) => never = (message) => go('/signup', 'error', message, values);

  if (!isSupabaseConfigured()) fail('Supabase is not configured yet. See the setup notice.');
  const parsed = parseSignUpForm(Object.fromEntries(formData));
  if (!parsed.ok) fail(parsed.error);
  const { full_name, email, phone, password } = parsed.data;
  const detected = String(formData.get('timezone') ?? '').trim();
  const timezone = detected && isValidTimeZone(detected) ? detected : '';

  const { data, error } = await createClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      // full_name is the official field. display_name is kept for older code. The database trigger
      // creates the profile from this metadata, so a repeated attempt cannot create a duplicate.
      data: { full_name, display_name: full_name, terms_accepted: 'true', ...(phone ? { phone } : {}), ...(timezone ? { timezone } : {}) }
    }
  });
  if (error) {
    if (error.code === 'user_already_exists' || /already registered/i.test(error.message)) fail('An account with this email already exists. Log in, or reset your password.');
    if (error.code === 'weak_password') fail('That password is too weak. Use at least 8 characters and avoid common passwords.');
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') fail('Too many attempts. Please wait a few minutes and try again.');
    fail('We could not create your account right now. Please try again.');
  }
  // When the email already belongs to a confirmed user, Supabase returns a user with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    fail('An account with this email already exists. Log in, or reset your password.');
  }
  if (data.session) redirect('/dashboard');
  go('/signin', 'ok', `Account created. We sent a confirmation link to ${email}. Open it, then log in.`);
}

export async function oauthAction(provider: 'google' | 'github') {
  if (!isSupabaseConfigured()) go('/signin', 'error', 'Supabase is not configured yet.');
  const { data, error } = await createClient().auth.signInWithOAuth({ provider, options: { redirectTo: `${siteUrl()}/auth/callback` } });
  if (error || !data.url) go('/signin', 'error', 'That sign-in option is not available right now. Use your email and password.');
  redirect(data.url);
}

export async function signOutAction() {
  if (isSupabaseConfigured()) await createClient().auth.signOut();
  redirect('/');
}

export async function forgotPasswordAction(formData: FormData) {
  if (!isSupabaseConfigured()) go('/forgot-password', 'error', 'Supabase is not configured yet.');
  const email = String(formData.get('email') ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) go('/forgot-password', 'error', 'Enter a valid email address.');
  const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
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
