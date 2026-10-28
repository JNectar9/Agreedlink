'use client';
import { useState } from 'react';

/** Searchable time zone field: type to search the full list, or tap a suggestion. */
export function TimezoneField({ defaultValue, zones }: { defaultValue: string; zones: string[] }) {
  const [value, setValue] = useState(defaultValue);
  const suggestions = ['Africa/Lagos', 'UTC'];
  return (
    <div>
      <label htmlFor="timezone" className="label">Time zone</label>
      <input id="timezone" name="timezone" list="timezone-options" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false} className="input" placeholder="Start typing, for example Lagos" required />
      <datalist id="timezone-options">{zones.map((z) => (<option key={z} value={z} />))}</datalist>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Suggested time zones">
        {suggestions.map((z) => (
          <button key={z} type="button" onClick={() => setValue(z)} aria-pressed={value === z}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${value === z ? 'border-brand bg-brand-soft text-navy' : 'border-line bg-white text-navy hover:bg-brand-soft'}`}>{z}</button>
        ))}
      </div>
      <p className="hint">Dates and times across AgreedLink use this zone. Everything is stored in UTC. New accounts start on Africa/Lagos.</p>
    </div>
  );
}
