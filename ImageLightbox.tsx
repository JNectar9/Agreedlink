'use client';
import { useRef, useState } from 'react';
import { X } from 'lucide-react';

/** A thumbnail that opens a larger view. Has loading and error states and works with keyboard and touch. */
export function ImageLightbox({ src, alt, downloadHref }: { src: string; alt: string; downloadHref?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className="flex h-40 w-full items-center justify-center rounded-xl border border-line bg-page p-3 text-center text-sm text-muted">Preview not available. Use Download to open this file.</div>;
  }

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} aria-label={`Enlarge ${alt}`}
        className={`relative block w-full overflow-hidden rounded-xl border border-line bg-page ${loaded ? '' : 'min-h-[10rem] animate-pulse'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="mx-auto max-h-64 w-full object-contain" />
      </button>
      <dialog ref={dialog} onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}
        className="m-auto max-h-[92vh] w-[min(96vw,64rem)] rounded-2xl border-0 bg-white p-3 backdrop:bg-black/70" aria-label={alt}>
        <div className="flex items-center justify-between gap-2 pb-2">
          <p className="min-w-0 break-words text-sm font-semibold text-navy">{alt}</p>
          <button type="button" onClick={() => dialog.current?.close()} className="btn-secondary shrink-0" aria-label="Close"><X size={16} aria-hidden="true" /> Close</button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="mx-auto max-h-[75vh] max-w-full object-contain" />
        {downloadHref ? <a href={downloadHref} className="btn-primary mt-3 w-full sm:w-auto">Download</a> : null}
      </dialog>
    </>
  );
}
