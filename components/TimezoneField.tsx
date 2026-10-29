'use client';
import { useEffect, useMemo, useState } from 'react';
import { SearchableSelect, type SelectOption } from './SearchableSelect';

function groupOf(zone: string): string {
  return zone.includes('/') ? zone.split('/')[0].replace(/_/g, ' ') : 'UTC and other';
}

/** Searchable, region-grouped list of every IANA time zone, with device detection and a live clock for the chosen zone. */
export function TimezoneField({ defaultValue, zones }: { defaultValue: string; zones: string[] }) {
  const [value, setValue] = useState(defaultValue);
  const [device, setDevice] = useState('');
  const [now, setNow] = useState('');
  const options: SelectOption[] = useMemo(
    () => zones.map((z) => ({ value: z, label: z.replace(/_/g, ' '), group: groupOf(z), keywords: z.replace(/[/_]/g, ' ') })),
    [zones]
  );

  useEffect(() => {
    try { setDevice(Intl.DateTimeFormat().resolvedOptions().timeZone); } catch { setDevice(''); }
  }, []);

  useEffect(() => {
    const tick = () => {
      try {
        setNow(new Intl.DateTimeFormat(undefined, { timeZone: value, weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date()));
      } catch { setNow(''); }
    };
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, [value]);

  const suggestions = ['Africa/Lagos', 'UTC'];
  return (
    <div>
      <SearchableSelect id="timezone" name="timezone" label="Time zone" options={options} value={value} onChange={setValue} placeholder="Search, for example Lagos or New York" />
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Suggested time zones">
        {suggestions.map((z) => (
          <button key={z} type="button" onClick={() => setValue(z)} aria-pressed={value === z}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${value === z ? 'border-brand bg-brand-soft text-navy' : 'border-line bg-white text-navy hover:bg-brand-soft'}`}>{z}</button>
        ))}
        {device && device !== value && zones.includes(device) ? (
          <button type="button" onClick={() => setValue(device)} className="rounded-full border border-brand bg-white px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft">Use this device: {device}</button>
        ) : null}
      </div>
      {now ? <p className="hint">Current time in {value.replace(/_/g, ' ')}: {now}</p> : null}
      <p className="hint">Dates and times across AgreedLink use this zone, including daylight saving changes. Everything is stored in UTC. New accounts start on the time zone of the device they sign up on, or Africa/Lagos if it cannot be detected.</p>
    </div>
  );
}
