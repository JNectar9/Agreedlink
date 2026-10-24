'use client';
import { useEffect, useState } from 'react';
import { Copy, Mail, MessageCircle, Share2 } from 'lucide-react';

type Props = { url: string; subject: string; defaultMessage: string };

/** Sharing never sends anything automatically: each button opens the user's own app. */
export function ShareButtons({ url, subject, defaultMessage }: Props) {
  const [message, setMessage] = useState(defaultMessage);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === 'function'), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="share-url" className="label">Customer link</label>
        <input id="share-url" readOnly value={url} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      </div>
      <div>
        <label htmlFor="share-message" className="label">Message (you can edit it)</label>
        <textarea id="share-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="input" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-primary"><Copy size={16} aria-hidden="true" /> Copy link</button>
        <a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(message)}`}>
          <MessageCircle size={16} aria-hidden="true" /> WhatsApp
        </a>
        <a className="btn-secondary" href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}>
          <Mail size={16} aria-hidden="true" /> Email
        </a>
        {canShare ? (
          <button type="button" className="btn-secondary" onClick={() => navigator.share({ title: subject, text: message }).catch(() => undefined)}>
            <Share2 size={16} aria-hidden="true" /> Share
          </button>
        ) : null}
      </div>
      <p role="status" className="text-sm text-muted">
        {copied === 'ok' ? 'Link copied.' : copied === 'fail' ? 'Copy failed. Select the link above and copy it manually.' : 'Nothing is sent until you choose an app and send it yourself.'}
      </p>
    </div>
  );
}
