import { requireSession } from '@/lib/data';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { CURRENCIES, CURRENCY_CODES } from '@/lib/money';
import { updateSettingsAction } from '../actions';

export const metadata = { title: 'Settings' };

export default async function SettingsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  const { profile, user } = await requireSession();
  const zones: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['UTC'];
  const zoneList = zones.includes(profile.timezone) ? zones : [profile.timezone, ...zones];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl sm:text-3xl">Settings</h1>
      <Notice error={searchParams.error} ok={searchParams.ok} />
      <form action={updateSettingsAction} className="card mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" value={user.email ?? ''} readOnly className="input bg-page" />
        </div>
        <div>
          <label htmlFor="display_name" className="label">Display name</label>
          <input id="display_name" name="display_name" defaultValue={profile.display_name} maxLength={120} className="input" />
        </div>
        <div>
          <label htmlFor="business_name" className="label">Business name</label>
          <input id="business_name" name="business_name" defaultValue={profile.business_name} maxLength={120} className="input" />
          <p className="hint">Shown to your customers on the approval page instead of your name.</p>
        </div>
        <div>
          <label htmlFor="timezone" className="label">Time zone</label>
          <select id="timezone" name="timezone" defaultValue={profile.timezone} className="input">
            {zoneList.map((z) => (<option key={z} value={z}>{z}</option>))}
          </select>
          <p className="hint">Dates and times in your dashboard use this zone. Everything is stored in UTC.</p>
        </div>
        <div>
          <label htmlFor="default_currency" className="label">Default currency</label>
          <select id="default_currency" name="default_currency" defaultValue={profile.default_currency} className="input">
            {CURRENCY_CODES.map((c) => (<option key={c} value={c}>{c} - {CURRENCIES[c].label}</option>))}
          </select>
        </div>
        <SubmitButton>Save settings</SubmitButton>
      </form>
    </div>
  );
}
