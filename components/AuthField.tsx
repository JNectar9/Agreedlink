'use client';
import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react';

const icons = { user: User, mail: Mail, phone: Phone, lock: Lock } as const;

type Props = {
  icon: keyof typeof icons;
  id: string;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'password';
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  title?: string;
  defaultValue?: string;
};

/** Dark-theme form field with a leading icon. Password fields get a show/hide button. */
export function AuthField({ icon, id, name, label, type = 'text', autoComplete, required, hint, minLength, maxLength, pattern, title, defaultValue }: Props) {
  const [shown, setShown] = useState(false);
  const Icon = icons[icon];
  const isPassword = type === 'password';
  return (
    <div className="text-left">
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="relative">
        <Icon size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" aria-hidden="true" />
        <input id={id} name={name} type={isPassword && shown ? 'text' : type} placeholder={label} autoComplete={autoComplete}
          required={required} minLength={minLength} maxLength={maxLength} pattern={pattern} title={title} defaultValue={defaultValue}
          aria-describedby={hint ? `${id}-hint` : undefined} className={`auth-input ${isPassword ? '!pr-12' : ''}`} />
        {isPassword ? (
          <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-blue-200 hover:text-white">
            {shown ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      {hint ? <p id={`${id}-hint`} className="mt-1.5 px-1 text-xs text-blue-300">{hint}</p> : null}
    </div>
  );
}
