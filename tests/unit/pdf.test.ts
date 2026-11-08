import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PdfDoc, textWidth, toWinAnsi, wrapText } from '@/lib/pdf';
import { buildAgreementPdf, pdfFileName, pdfMoney, type PdfInput } from '@/lib/agreement-pdf';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const asText = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');

const input: PdfInput = {
  agreement: { projectName: 'Logo (v2) \\ test',
    clientName: 'Ada',
    clientEmail: null,
    status: 'approved',
    currency: 'NGN',
    originalAmountMinor: 100000,
    currentAmountMinor: 150000,
    deliveryDate: '2026-12-01',
    version: 2,
    createdAt: '2026-11-01T10:00:00Z',
    completedAt: null },
  terms: { project_name: 'x',
    client_name: 'x',
    client_email: null,
    description: 'A logo for the shop',
    deliverables: 'PNG',
    start_date: null,
    delivery_date: '2026-12-01',
    currency: 'NGN',
    amount_minor: 150000,
    included_revisions: 2,
    revision_definition: '',
    excluded_work: '',
    additional_work_pricing: 'quote_first',
    additional_work_price_minor: null,
    payment_terms_text: '' },
  creator: { name: 'Studio', email: 'a@b.com', phone: '', website: '', address: '' },
  approval: { approved_by_name: 'Ada', auth_method: 'secure_link' },
  versions: [{ number: 1, createdAt: '2026-11-01T10:00:00Z', amountMinor: 100000, deliveryDate: '2026-11-20' }],
  changes: [], timezone: 'UTC', generatedAt: '2026-11-11T12:00:00Z'
};

describe('pdf text handling', () => {
  it('keeps accents and curly quotes, and turns unsupported characters into ?', () => {
    expect(toWinAnsi('Café')).toBe('Caf\u00e9');
    expect(toWinAnsi('\u201cHi\u201d').charCodeAt(0)).toBe(0x93);
    expect(toWinAnsi('\u20a6100')).toBe('?100');
    expect(toWinAnsi('a\u202fb')).toBe('a b');
    expect(toWinAnsi('x\u0000y')).toBe('xy');
  });
  it('measures text and never wraps wider than the column', () => {
    expect(textWidth('', 10)).toBe(0);
    expect(textWidth('Hello', 10) > 0).toBe(true);
    const lines = wrapText('word '.repeat(200) + 'x'.repeat(300), 10.5, 495);
    for (const l of lines) expect(textWidth(l, 10.5) <= 495.5, l.slice(0, 20)).toBe(true);
    expect(wrapText('one\n\ntwo', 10, 400)).toEqual(['one', '', 'two']);
  });
});

describe('pdf file structure', () => {
  const bytes = buildAgreementPdf(input);
  const text = asText(bytes);
  it('has a PDF header, one startxref and an end marker', () => {
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text.match(/startxref/g)?.length).toBe(1);
  });
  it('every cross-reference offset points at its object', () => {
    const start = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(text.slice(start, start + 4)).toBe('xref');
    const entries = text.slice(start).match(/^\d{10} 00000 n $/gm) ?? [];
    expect(entries.length).toBeGreaterThan(5);
    entries.forEach((e, i) => {
      const off = Number(e.slice(0, 10));
      expect(text.slice(off, off + String(i + 1).length + 6)).toBe(`${i + 1} 0 obj`);
    });
  });
  it('escapes brackets and backslashes inside text', () => {
    expect(text).toContain('Logo \\(v2\\) \\\\ test');
  });
  it('writes money with the currency code, not a symbol', () => {
    expect(pdfMoney(150000, 'NGN')).toBe('NGN 1,500.00');
    expect(pdfMoney(-500, 'USD')).toBe('-USD 5.00');
    expect(text).toContain('NGN 1,500.00');
    expect(text).toContain('originally NGN 1,000.00');
  });
  it('states the approval honestly and includes the footer', () => {
    expect(text).toContain('Typed name on a secure link');
    expect(text).toContain('Not legal advice');
    expect(text).toContain('Page 1 of 1');
  });
  it('breaks onto more pages when the content is long', () => {
    const many = buildAgreementPdf({ ...input, changes: Array.from({ length: 60 }, () => ({ status: 'approved', description: 'Extra work item with some detail', priceDeltaMinor: 100, createdAt: '2026-11-08T10:00:00Z', decidedAt: null, decidedBy: null })) });
    const t = asText(many);
    const pages = Number(t.match(/\/Count (\d+)/)?.[1]);
    expect(pages).toBeGreaterThan(1);
    expect(t).toContain(`Page ${pages} of ${pages}`);
  });
  it('can build an empty document too', () => {
    expect(asText(new PdfDoc('Empty').build('footer')).startsWith('%PDF-1.4')).toBe(true);
  });
});

describe('file names', () => {
  it('are safe ASCII', () => {
    expect(pdfFileName('Logo Design!', 2)).toBe('agreement-logo-design-v2.pdf');
    expect(pdfFileName('\u00bf\u00bf\u00bf', 1)).toBe('agreement-record-v1.pdf');
    expect(pdfFileName('../../etc/passwd', 1)).toBe('agreement-etc-passwd-v1.pdf');
  });
});

describe('download route', () => {
  const route = read('app/dashboard/agreements/[id]/pdf/route.ts');
  it('requires a signed-in user, a valid id and a paid plan', () => {
    expect(route).toContain('requireSession()');
    expect(route).toContain('isUuid(params.id)');
    expect(route).toContain("plan !== 'pro' && plan !== 'premium'");
  });
  it('reads the agreement through row-level security and never caches the file', () => {
    expect(route).toContain(".from('agreements')");
    expect(route).not.toContain('createAdminClient');
    expect(route).toContain('private, no-store');
    expect(route).toContain('attachment; filename=');
  });
  it('the agreement page shows the tools card and keeps its existing sections', () => {
    const page = read('app/dashboard/agreements/[id]/page.tsx');
    expect(page).toContain('<AgreementTools agreementId={a.id} />');
    expect(page).toContain('Customer link');
    expect(page).toContain('completeAgreementAction');
  });
});
