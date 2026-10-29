import { fitWithin } from './image-size';

export type Compressed = { blob: Blob; type: 'image/webp' | 'image/jpeg'; width: number; height: number };

async function loadBitmap(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      // fall through to the image element
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('The image could not be read.'));
    img.src = url;
  });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Browser only. Resizes so the longest side is at most `maxSide` and re-encodes as WebP (or JPEG where WebP is unavailable). */
export async function compressImage(file: File, maxSide = 1024, quality = 0.85): Promise<Compressed> {
  const img = await loadBitmap(file);
  try {
    const size = fitWithin(img.width, img.height, maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot prepare the photo.');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(img.source, 0, 0, size.width, size.height);
    for (const type of ['image/webp', 'image/jpeg'] as const) {
      const blob = await toBlob(canvas, type, quality);
      if (blob && blob.type === type) return { blob, type, width: size.width, height: size.height };
    }
    throw new Error('This browser cannot prepare the photo.');
  } finally {
    img.release();
  }
}
