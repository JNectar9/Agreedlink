'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Eye, EyeOff, FileText, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { SubmitButton } from '@/components/SubmitButton';
import { formatBytes, typeLabel } from '@/lib/attachments';
import { fileKind, formatFileDate } from '@/lib/attachment-visibility';
import { deleteAttachmentAction, renameAttachmentFormAction } from '@/app/dashboard/attachments/actions';
import { toggleVisibilityAction } from '@/app/dashboard/attachments/visibility-actions';

export type AttachmentCardProps = {
  id: string;
  agreementId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  customerVisible: boolean;
  /** A short-lived private picture link made on the server for images, or null. */
  thumbUrl: string | null;
};

const PRIVATE_NOTE = 'This file is now private. Your customer cannot see it.';
const VISIBLE_NOTE = 'This file is now visible. Your customer can see and download it.';

const BTN = 'inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold';
const BLUE = `${BTN} border-brand/30 bg-brand-soft/60 text-brand hover:bg-brand-soft`;
const GREY = `${BTN} border-line bg-page text-ink hover:bg-slate-100`;
const RED = `${BTN} border-bad/30 bg-bad-bg/60 text-bad hover:bg-bad-bg`;

/** One file on the attachments page: picture, details, and the actions. Rename and Delete open a small panel below. */
export function AttachmentCard(p: AttachmentCardProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<'rename' | 'delete' | null>(null);
  const [menu, setMenu] = useState(false);
  // The badge, the button and the banner all read p.customerVisible, which the server reads from the database.
  // Nothing here keeps its own copy of the state.
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [note, setNote] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const isPrivate = !p.customerVisible;
  const kind = fileKind(p.mimeType);

  // After the server confirmed a change we ask for fresh data. Only when the fresh data agrees do the badge, the button
  // and the banner change together.
  useEffect(() => {
    if (confirmed !== null && p.customerVisible === confirmed) {
      setNote({ kind: 'ok', text: confirmed ? VISIBLE_NOTE : PRIVATE_NOTE });
      setConfirmed(null);
      setBusy(false);
    }
  }, [p.customerVisible, confirmed]);

  // If the fresh data never arrives, say so instead of leaving the button stuck.
  useEffect(() => {
    if (confirmed === null) return undefined;
    const timer = setTimeout(() => {
      setConfirmed(null);
      setBusy(false);
      setNote({ kind: 'error', text: 'Saved, but the page did not update. Refresh to see the current state.' });
    }, 10000);
    return () => clearTimeout(timer);
  }, [confirmed]);

  async function toggleVisibility() {
    setNote(null);
    setBusy(true);
    try {
      const result = await toggleVisibilityAction(p.id, isPrivate);
      if (!result.ok) {
        setBusy(false);
        setNote({ kind: 'error', text: result.error });
        return;
      }
      setConfirmed(result.customerVisible);
      router.refresh();
    } catch {
      setBusy(false);
      setNote({ kind: 'error', text: 'Something went wrong. Please try again.' });
    }
  }
  const inline = `/dashboard/attachments/${p.id}/download?inline=1`;
  const open = (which: 'rename' | 'delete') => { setPanel((cur) => (cur === which ? null : which)); setMenu(false); };

  return (
    <li className="space-y-3 rounded-2xl border border-line bg-white p-3 shadow-sm">
      {kind === 'image' && p.thumbUrl ? (
        <a href={inline} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.fileName}`} className="block overflow-hidden rounded-xl border border-line bg-page">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.thumbUrl} alt={p.fileName} loading="lazy" className="h-40 w-full object-cover" />
        </a>
      ) : (
        <div className="flex h-24 flex-col items-center justify-center rounded-xl border border-line bg-page text-muted">
          <FileText size={28} aria-hidden="true" />
          <span className="mt-1 text-xs">{typeLabel(p.mimeType)}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-base font-bold text-navy">{p.fileName}</p>
          <p className="text-sm text-muted">{formatBytes(p.sizeBytes)} &bull; {formatFileDate(p.createdAt)}</p>
        </div>
        <div className="relative shrink-0">
          <button type="button" onClick={() => setMenu((v) => !v)} onKeyDown={(e) => { if (e.key === 'Escape') setMenu(false); }}
            aria-haspopup="menu" aria-expanded={menu} aria-label={`More actions for ${p.fileName}`}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-page">
            <MoreVertical size={20} aria-hidden="true" />
          </button>
          {menu ? (
            <div role="menu" className="absolute right-0 z-10 mt-1 w-40 rounded-xl border border-line bg-white p-1 shadow-lg">
              <button type="button" role="menuitem" onClick={() => open('rename')} className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-page"><Pencil size={16} aria-hidden="true" /> Rename</button>
              <button type="button" role="menuitem" onClick={() => open('delete')} className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-bad hover:bg-bad-bg"><Trash2 size={16} aria-hidden="true" /> Delete</button>
            </div>
          ) : null}
        </div>
      </div>

      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${isPrivate ? 'bg-slate-100 text-slate-700' : 'bg-ok-bg text-ok'}`}>
        {isPrivate ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />} {isPrivate ? 'Private - Only you can see this' : 'Visible to customer'}
      </span>

      <div className="grid grid-cols-2 gap-2">
        {kind !== 'other' ? (
          <a href={inline} target="_blank" rel="noopener noreferrer" className={BLUE}><Eye size={16} aria-hidden="true" /> Preview</a>
        ) : null}
        <a href={`/dashboard/attachments/${p.id}/download`} className={`${BLUE} ${kind === 'other' ? 'col-span-2' : ''}`}><Download size={16} aria-hidden="true" /> Download</a>

        <button type="button" onClick={toggleVisibility} disabled={busy} className={`${GREY} col-span-2 disabled:opacity-60`}>
          {busy ? 'Saving...' : isPrivate ? <><Eye size={16} aria-hidden="true" /> Make visible</> : <><EyeOff size={16} aria-hidden="true" /> Make private</>}
        </button>

        <button type="button" onClick={() => open('rename')} aria-expanded={panel === 'rename'} className={GREY}><Pencil size={16} aria-hidden="true" /> Rename</button>
        <button type="button" onClick={() => open('delete')} aria-expanded={panel === 'delete'} className={RED}><Trash2 size={16} aria-hidden="true" /> Delete</button>
      </div>

      {note ? (
        <p role={note.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${note.kind === 'error' ? 'border-bad/30 bg-bad-bg text-bad' : 'border-ok/30 bg-ok-bg text-ok'}`}>{note.text}</p>
      ) : null}

      {panel === 'rename' ? (
        <form action={renameAttachmentFormAction} className="space-y-2 rounded-xl border border-line bg-page p-3">
          <input type="hidden" name="attachment_id" value={p.id} />
          <input type="hidden" name="agreement_id" value={p.agreementId} />
          <label htmlFor={`rename-${p.id}`} className="label">New file name</label>
          <input id={`rename-${p.id}`} name="file_name" defaultValue={p.fileName} maxLength={150} required className="input" />
          <div className="flex gap-2">
            <SubmitButton pendingText="Saving..." className="flex-1">Save name</SubmitButton>
            <button type="button" onClick={() => setPanel(null)} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      ) : null}

      {panel === 'delete' ? (
        <form action={deleteAttachmentAction} className="space-y-2 rounded-xl border border-bad/30 bg-bad-bg/40 p-3">
          <input type="hidden" name="attachment_id" value={p.id} />
          <input type="hidden" name="agreement_id" value={p.agreementId} />
          <p className="text-sm text-ink">This permanently removes the file. Approval records that already listed it are kept.</p>
          <div className="flex gap-2">
            <SubmitButton variant="danger" pendingText="Deleting..." className="flex-1"><Trash2 size={16} aria-hidden="true" /> Delete file</SubmitButton>
            <button type="button" onClick={() => setPanel(null)} className="btn-secondary flex-1">Keep file</button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
