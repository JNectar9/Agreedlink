/* eslint-disable @next/next/no-img-element */
/** Profile picture, or initials on a blue circle when there is no photo. */
export function Avatar({ url, initials, size = 36 }: { url?: string | null; initials: string; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size / 2.6)) };
  return url ? (
    <img src={url} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span style={style} className="flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white" aria-hidden="true">{initials}</span>
  );
}
