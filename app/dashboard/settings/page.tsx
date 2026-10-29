import { requireSession } from '@/lib/data';
import { isOwnerEmail } from '@/lib/admin';
import { SITE } from '@/lib/site';
import { signedAvatarUrl } from '@/lib/avatar';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { AvatarUploader } from '@/components/AvatarUploader';
import { TimezoneField } from '@/components/TimezoneField';
import { currencyOptions } from '@/lib/money';
import { CurrencyField } from '@/components/CurrencyField';
import { signOutAction } from '@/app/auth/actions';
import { updateSettingsAction } from '../actions';

export const metadata = { title: 'Settings' };

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { supabase, user, profile } = await requireSession();
  const zones: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['UTC'];
  const zoneList = Array.from(new Set(['Africa/Lagos', 'UTC', ...zones]));
  const avatarUrl = await signedAvatarUrl(supabase, profile.avatar_path);
  const name = profile.display_name || user.email || 'A';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'A';
  // Only the platform owner sees JNectar's own details pre-filled, and only while those fields are empty.
  const owner = isOwnerEmail(user.email);
  const biz = {
    name: profile.business_name || (owner ? SITE.company : ''),
    email: profile.business_email || (owner ? SITE.email : ''),
    phone: profile.business_phone || (owner ? SITE.phone : ''),
    website: profile.business_website || (owner ? SITE.website : '')
  };

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl sm:text-3xl">Settings</h1>
      <Notice error={searchParams.error} ok={searchParams.ok} />
      <AvatarUploader userId={user.id} currentUrl={avatarUrl} initials={initials} hasPhoto={Boolean(profile.avatar_path)} />

      <form action={updateSettingsAction} className="card space-y-4">
        <h2 className="text-lg">Your account</h2>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" value={user.email ?? ''} readOnly className="input bg-page" />
        </div>
        <div>
          <label htmlFor="display_name" className="label">Full name</label>
          <input id="display_name" name="display_name" defaultValue={profile.display_name} maxLength={120} autoComplete="name" className="input" />
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone number (optional)</label>
          <input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ''} maxLength={30} autoComplete="tel" className="input" />
          <p className="hint">Include country code (e.g. +234...)</p>
        </div>

        <div className="border-t border-line pt-4">
          <h2 className="text-lg">Business information</h2>
          <p className="hint">Optional. Shown to your customers on the approval page. Leave a field blank to show nothing. The address is never filled in for you.</p>
        </div>
        <div>
          <label htmlFor="business_name" className="label">Business name</label>
          <input id="business_name" name="business_name" defaultValue={biz.name} maxLength={120} className="input" />
        </div>
        <div>
          <label htmlFor="business_phone" className="label">Business phone or WhatsApp</label>
          <input id="business_phone" name="business_phone" type="tel" defaultValue={biz.phone} maxLength={40} className="input" />
        </div>
        <div>
          <label htmlFor="business_website" className="label">Website</label>
          <input id="business_website" name="business_website" inputMode="url" defaultValue={biz.website} maxLength={200} placeholder="https://" className="input" />
        </div>
        <div>
          <label htmlFor="business_email" className="label">Business email</label>
          <input id="business_email" name="business_email" type="email" defaultValue={biz.email} maxLength={254} className="input" />
        </div>
        <div>
          <label htmlFor="business_address" className="label">Business address</label>
          <textarea id="business_address" name="business_address" defaultValue={profile.business_address ?? ''} maxLength={300} rows={2} className="input" />
        </div>

        <div className="border-t border-line pt-4"><h2 className="text-lg">Preferences</h2></div>
        <TimezoneField defaultValue={profile.timezone} zones={zoneList} />
        <CurrencyField id="default_currency" name="default_currency" label="Default currency" defaultValue={profile.default_currency} currencies={currencyOptions()} hint="Used for new agreements and for prices on the pricing and billing pages. Each agreement keeps the currency it was created in, and AgreedLink never converts amounts." />

        <div className="sticky bottom-[68px] z-10 -mx-5 border-t border-line bg-white/95 p-3 backdrop-blur sm:-mx-6 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <SubmitButton pendingText="Saving…" className="w-full md:w-auto">Save settings</SubmitButton>
        </div>
      </form>
      <form action={signOutAction}><button className="btn-secondary w-full sm:w-auto">Log out</button></form>
    </div>
  );
}
