'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string; group?: string; keywords?: string };

type Props = {
  id: string;
  name: string;
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/** Accessible searchable dropdown (combobox) with optional group headings. Submits the chosen value in a hidden field. */
export function SearchableSelect({ id, name, label, options, value, onChange, placeholder = 'Type to search' }: Props) {
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.keywords ?? ''} ${o.value}`.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, listId]);

  function choose(option: SelectOption | undefined) {
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    setQuery('');
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); choose(filtered[active]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    else if (e.key === 'Tab') setOpen(false);
  }

  let lastGroup: string | undefined;
  return (
    <div ref={root} className="relative">
      <label htmlFor={id} className="label">{label}</label>
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <input id={id} role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" autoComplete="off" spellCheck={false}
          className="input pr-10" placeholder={selected ? selected.label : placeholder}
          value={open ? query : selected?.label ?? value}
          onFocus={() => { setOpen(true); setQuery(''); setActive(0); }}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onKeyDown={onKey} />
        <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
      </div>
      {open ? (
        <ul id={listId} role="listbox" aria-label={label} className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-xl">
          {filtered.length === 0 ? <li className="px-3 py-3 text-sm text-muted">No matches. Try a different search.</li> : null}
          {filtered.map((o, i) => {
            const heading = o.group && o.group !== lastGroup ? o.group : null;
            lastGroup = o.group;
            return (
              <li key={o.value} role="presentation">
                {heading ? <p className="sticky top-0 bg-page px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{heading}</p> : null}
                <div id={`${listId}-opt-${i}`} role="option" aria-selected={o.value === value}
                  onMouseDown={(e) => { e.preventDefault(); choose(o); }} onMouseEnter={() => setActive(i)}
                  className={`min-h-[44px] cursor-pointer px-3 py-2.5 text-sm ${i === active ? 'bg-brand-soft text-navy' : 'text-ink'} ${o.value === value ? 'font-semibold' : ''}`}>
                  {o.label}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
