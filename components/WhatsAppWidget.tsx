'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

const topics = [
  { label: 'I have a question', text: 'Hello AgreedLink, I have a question.' },
  { label: 'Support', text: 'Hello AgreedLink, I need support.' },
  { label: 'Account and billing', text: 'Hello AgreedLink, I have a question about my account or billing.' },
  { label: 'Talk to a human', text: 'Hello AgreedLink, I would like to talk to someone.' }
];

/** Floating WhatsApp helper. Each option opens WhatsApp with a prefilled message. It is not an automated bot. */
export function WhatsAppWidget({ number }: { number: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const link = (text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      {open ? (
        <div role="dialog" aria-label="Chat on WhatsApp" className="w-[min(88vw,20rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-[#075E54] px-4 py-3 text-white">
            <div><p className="text-sm font-semibold">WhatsApp</p><p className="text-xs text-green-100">Chat with JNectar</p></div>
            <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10" aria-label="Close chat"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="space-y-3 bg-[#ECE5DD] p-4">
            <p className="max-w-[85%] rounded-xl rounded-tl-none bg-white p-3 text-sm text-ink shadow-sm">Hi! Welcome to AgreedLink. How can we help you today?</p>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <a key={t.label} href={link(t.text)} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#25D366] bg-white px-3 py-1.5 text-xs font-semibold text-[#075E54] hover:bg-green-50">{t.label}</a>
              ))}
            </div>
            <p className="text-[11px] text-muted">Choosing an option opens WhatsApp with a message ready to send. Replies come from JNectar, not an automatic bot.</p>
          </div>
        </div>
      ) : null}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Close WhatsApp chat' : 'Chat on WhatsApp'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:brightness-95">
        <MessageCircle size={26} aria-hidden="true" />
      </button>
    </div>
  );
}
