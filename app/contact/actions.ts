'use server';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { isServerConfigured } from '@/lib/env';
import { checkSpamSignals, parseContactForm } from '@/lib/contact';

function back(kind: 'error' | 'sent', value: string): never {
  redirect(`/contact?${kind}=${encodeURIComponent(value)}`);
}

export async function sendContactAction(formData: FormData) {
  const input = Object.fromEntries(formData);
  if (!checkSpamSignals(input, Date.now()).ok) back('error', 'Please wait a few seconds after opening the page, then send again.');
  const parsed = parseContactForm(input);
  if (!parsed.ok) back('error', parsed.error);
  if (!isServerConfigured()) back('error', 'Messages cannot be saved right now. Please email or WhatsApp us instead.');

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('submit_contact_message', {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_subject: parsed.data.subject,
    p_message: parsed.data.message
  });
  if (error || !data?.ok) {
    const limited = data?.error === 'rate_limited' || data?.error === 'busy';
    back('error', limited ? 'Too many messages were sent recently. Please try again later or use email or WhatsApp.' : 'Your message could not be saved. Please email or WhatsApp us instead.');
  }

  // Optional email notification to JNectar. Only used when a provider is configured; failure never
  // changes the result because the message is already saved.
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (key && to && from) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: parsed.data.email,
          subject: `AgreedLink contact: ${(parsed.data.subject || 'New message').slice(0, 100)}`,
          text: `From: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`
        })
      });
      if (res.ok) await admin.from('contact_messages').update({ notified_at: new Date().toISOString() }).eq('id', data.id);
    } catch {
      // Notification is best effort.
    }
  }
  back('sent', '1');
}
