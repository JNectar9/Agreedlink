'use client';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

type Props = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  name?: string;
  value?: string;
  className?: string;
};

/** Submit button with a visible loading state that also blocks double submission. */
const VARIANT = { primary: 'btn-primary', secondary: 'btn-secondary', danger: 'btn-danger' } as const;

export function SubmitButton({ children, variant = 'primary', name, value, className = '' }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className={`${VARIANT[variant]} ${className}`}>
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
