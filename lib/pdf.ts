// A small, dependency-free PDF writer: A4 pages, built-in Helvetica fonts, text, rules and automatic page breaks.
// Only characters in the WinAnsi set (Western European text) are drawn; anything else prints as "?".
// Money is written with the currency code (for example NGN 1,500.00) so no currency symbol is ever lost.

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;

// Helvetica advance widths (per 1000 units) for the characters 32 to 126.
const W = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
];
const SPECIAL_WIDTH: Record<number, number> = { 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000 };
const SPECIAL_CODE: Record<number, number> = {
  0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2026: 0x85, 0x20ac: 0x80, 0x2122: 0x99
};

/** Converts text to a string where every character is one WinAnsi byte. Unsupported characters become "?". */
export function toWinAnsi(text: string): string {
  let out = '';
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 63;
    if (c === 10) out += '\n';
    else if (c === 9 || c === 0xa0 || (c >= 0x2000 && c <= 0x200a) || c === 0x202f || c === 0x205f || c === 0x3000) out += ' ';
    else if (c === 13 || c < 32 || c === 127 || (c >= 0x200b && c <= 0x200f) || c === 0xfeff) out += '';
    else if (SPECIAL_CODE[c] !== undefined) out += String.fromCharCode(SPECIAL_CODE[c]);
    else if ((c >= 32 && c <= 126) || (c >= 161 && c <= 255)) out += String.fromCharCode(c);
    else out += '?';
  }
  return out;
}

function charWidth(code: number): number {
  if (code >= 32 && code <= 126) return W[code - 32];
  return SPECIAL_WIDTH[code] ?? 556;
}

/** Width of text in points. Bold is measured a little wide on purpose so wrapped lines never overflow. */
export function textWidth(text: string, size: number, bold = false): number {
  let units = 0;
  for (const ch of toWinAnsi(text)) units += charWidth(ch.charCodeAt(0));
  return (units / 1000) * size * (bold ? 1.08 : 1);
}

/** Splits text into lines no wider than maxWidth. Keeps paragraph breaks and splits very long words. */
export function wrapText(text: string, size: number, maxWidth: number, bold = false): string[] {
  const lines: string[] = [];
  for (const paragraph of toWinAnsi(text).split('\n')) {
    const words = paragraph.split(' ').filter((w) => w.length > 0);
    if (words.length === 0) { lines.push(''); continue; }
    let line = '';
    for (let word of words) {
      while (textWidth(word, size, bold) > maxWidth) {
        let cut = word.length;
        while (cut > 1 && textWidth(word.slice(0, cut), size, bold) > maxWidth) cut -= 1;
        if (line) { lines.push(line); line = ''; }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (line && textWidth(next, size, bold) > maxWidth) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

const esc = (s: string) => s.replace(/[\\()]/g, '\\$&');
const num = (n: number) => (Math.round(n * 100) / 100).toString();

type Color = [number, number, number];
export const NAVY: Color = [0.04, 0.1, 0.24];
export const GREY: Color = [0.38, 0.43, 0.5];
export const INK: Color = [0.1, 0.13, 0.18];
export const LINE: Color = [0.82, 0.85, 0.9];

export class PdfDoc {
  private pages: string[][] = [[]];
  private y = PAGE_H - MARGIN;
  readonly width = PAGE_W - MARGIN * 2;

  constructor(private readonly title: string) {}

  private ops() { return this.pages[this.pages.length - 1]; }

  private ensure(height: number) {
    if (this.y - height < MARGIN + 24) { this.pages.push([]); this.y = PAGE_H - MARGIN; }
  }

  private draw(x: number, y: number, text: string, size: number, bold: boolean, color: Color) {
    this.ops().push(`BT /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${color.map(num).join(' ')} rg 1 0 0 1 ${num(x)} ${num(y)} Tm (${esc(text)}) Tj ET`);
  }

  gap(points: number) { this.y -= points; }

  rule() {
    this.ensure(10);
    this.y -= 4;
    this.ops().push(`${LINE.map(num).join(' ')} RG 0.7 w ${num(MARGIN)} ${num(this.y)} m ${num(MARGIN + this.width)} ${num(this.y)} l S`);
    this.y -= 8;
  }

  /** Wrapped text in the document column. Lines break across pages when needed. */
  paragraph(text: string, o: { size?: number; bold?: boolean; color?: Color; indent?: number; leading?: number } = {}) {
    const size = o.size ?? 10.5;
    const leading = o.leading ?? size * 1.4;
    const indent = o.indent ?? 0;
    for (const line of wrapText(text, size, this.width - indent, o.bold ?? false)) {
      this.ensure(leading);
      this.y -= leading;
      if (line) this.draw(MARGIN + indent, this.y, line, size, o.bold ?? false, o.color ?? INK);
    }
  }

  heading(text: string, size = 13) {
    this.ensure(size * 2.4);
    this.gap(size * 0.7);
    this.paragraph(text, { size, bold: true, color: NAVY });
    this.gap(2);
  }

  /** A label above its value, for the summary and terms. */
  field(label: string, value: string) {
    this.ensure(30);
    this.paragraph(label, { size: 8.5, bold: true, color: GREY, leading: 11 });
    this.paragraph(value && value.trim() ? value : 'None listed', { size: 10.5 });
    this.gap(4);
  }

  /** Finishes the document with a footer on every page and returns the PDF bytes. */
  build(footer: string): Uint8Array {
    const total = this.pages.length;
    this.pages.forEach((ops, i) => {
      const f = toWinAnsi(footer);
      ops.push(`BT /F1 8 Tf ${GREY.map(num).join(' ')} rg 1 0 0 1 ${MARGIN} 28 Tm (${esc(wrapText(f, 8, this.width - 70)[0] ?? '')}) Tj ET`);
      const label = `Page ${i + 1} of ${total}`;
      ops.push(`BT /F1 8 Tf ${GREY.map(num).join(' ')} rg 1 0 0 1 ${num(MARGIN + this.width - textWidth(label, 8))} 28 Tm (${label}) Tj ET`);
    });

    const objects: string[] = [];
    const pageObjStart = 5;
    const kids = this.pages.map((_, i) => `${pageObjStart + i * 2} 0 R`).join(' ');
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${total} >>`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    this.pages.forEach((ops, i) => {
      const content = ops.join('\n');
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageObjStart + i * 2 + 1} 0 R >>`);
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });
    const info = objects.length + 1;
    const safeTitle = esc(toWinAnsi(this.title).replace(/[^\x20-\x7e]/g, '?').slice(0, 120));
    objects.push(`<< /Title (${safeTitle}) /Producer (AgreedLink) >>`);

    let body = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
    const offsets: number[] = [];
    objects.forEach((obj, i) => { offsets.push(body.length); body += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
    const xref = body.length;
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const o of offsets) body += `${String(o).padStart(10, '0')} 00000 n \n`;
    body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

    const bytes = new Uint8Array(body.length);
    for (let i = 0; i < body.length; i += 1) bytes[i] = body.charCodeAt(i) & 255;
    return bytes;
  }
}
