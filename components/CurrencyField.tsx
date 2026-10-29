'use client';
import { useMemo, useState } from 'react';
import { SearchableSelect, type SelectOption } from './SearchableSelect';

type Currency = { code: string; name: string; symbol: string };
const POPULAR = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];

/** Searchable list of world currencies (code, name, symbol). Submits the ISO code, for example NGN. */
export function CurrencyField({ id, name, label, defaultValue, currencies, hint }: { id: string; name: string; label: string; defaultValue: string; currencies: Currency[]; hint?: string }) {
  const [value, setValue] = useState(defaultValue);
  const options: SelectOption[] = useMemo(
    () => currencies.map((c) => ({ value: c.code, label: `${c.code}  ${c.name}  (${c.symbol})`, group: POPULAR.includes(c.code) ? 'Popular' : 'All currencies', keywords: `${c.name} ${c.symbol}` })),
    [currencies]
  );
  return (
    <div>
      <SearchableSelect id={id} name={name} label={label} options={options} value={value} onChange={setValue} placeholder="Search by code, name or symbol" />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
