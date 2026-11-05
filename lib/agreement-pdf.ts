// Builds the downloadable PDF record of one agreement from data the owner can already see on screen.
import { PdfDoc } from './pdf';
import { currencyExponent } from './money';
import { describeIdentity, type ApprovalIdentity } from './identity';
import { formatDateTime, formatPlainDate } from './time';
import type { Terms } from './terms';

export type PdfVersion = { number: number; createdAt: string; amountMinor: number; deliveryDate: string };
export type PdfChange = { status: string; description: string; priceDeltaMinor: number; createdAt: string; decidedAt: string | null; decidedBy: string | null };
export type PdfInput = {
  agreement: {
    projectName: string; clientName: string; clientEmail: string | null; status: string; currency: string;
    originalAmountMinor: number; currentAmountMinor: number; deliveryDate: string; version: number; createdAt: string; completedAt: string | null;
  };
  terms: Terms;
  creator: { name: string; email: string; phone: string; website: string; address: string };
  approval: (ApprovalIdentity & { approved_at?: string | null }) | null;
  versions: PdfVersion[];
  changes: PdfChange[];
  timezone: string;
  generatedAt: string;
};

/** Money with the currency code, never a symbol, so every currency prints correctly: NGN 1,500.00 */
export function pdfMoney(minor: number, currency: string): string {
  const exp = currencyExponent(currency);
  const value = (Math.abs(minor) / 10 ** exp).toLocaleString('en-US', { minimumFractionDigits: exp, maximumFractionDigits: exp });
  return `${minor < 0 ? '-' : ''}${currency} ${value}`;
}

function pdfDelta(minor: number, currency: string): string {
  return minor > 0 ? `+${pdfMoney(minor, currency)}` : pdfMoney(minor, currency);
}

const STATUS: Record<string, string> = {
  draft: 'Draft', awaiting_approval: 'Awaiting approval', approved: 'Approved', declined: 'Declined', completed: 'Completed', expired: 'Expired', cancelled: 'Cancelled',
  pending: 'Pending', clarification_requested: 'Clarification requested', rejected: 'Rejected', withdrawn: 'Withdrawn', superseded: 'Superseded'
};
const statusText = (s: string) => STATUS[s] ?? s.replace(/_/g, ' ');

function extraWork(t: Terms): string {
  if (t.additional_work_pricing === 'quote_first') return 'Quoted before any extra work begins';
  const price = t.additional_work_price_minor == null ? 'price not set' : pdfMoney(t.additional_work_price_minor, t.currency);
  return t.additional_work_pricing === 'hourly' ? `Hourly: ${price}` : `Fixed per item: ${price}`;
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

export function buildAgreementPdf(input: PdfInput): Uint8Array {
  const { agreement: a, terms: t, creator: c, approval, versions, changes, timezone: tz } = input;
  const doc = new PdfDoc(`Agreement record: ${a.projectName}`);

  doc.paragraph('AGREEDLINK  |  AGREEMENT RECORD', { size: 8.5, bold: true, color: [0.38, 0.43, 0.5] });
  doc.gap(2);
  doc.paragraph(a.projectName, { size: 20, bold: true, color: [0.04, 0.1, 0.24], leading: 26 });
  doc.paragraph(`For ${a.clientName}`, { size: 12 });
  doc.paragraph(`Status: ${statusText(a.status)}   |   Version ${a.version}`, { size: 10, color: [0.38, 0.43, 0.5] });
  doc.rule();

  doc.heading('Summary');
  doc.field('Prepared by', [c.name, c.email, c.phone, c.website, c.address].filter(Boolean).join('\n'));
  doc.field('Client', [a.clientName, a.clientEmail ?? ''].filter(Boolean).join('\n'));
  doc.field('Total price', pdfMoney(a.currentAmountMinor, a.currency) + (a.currentAmountMinor !== a.originalAmountMinor ? ` (originally ${pdfMoney(a.originalAmountMinor, a.currency)})` : ''));
  doc.field('Delivery date', formatPlainDate(a.deliveryDate));
  if (t.start_date) doc.field('Start date', formatPlainDate(t.start_date));
  doc.field('Created', formatDateTime(a.createdAt, tz));
  if (a.completedAt) doc.field('Completed', formatDateTime(a.completedAt, tz));

  doc.rule();
  doc.heading(`Agreed terms (version ${a.version})`);
  doc.field('Project description', t.description);
  doc.field('Deliverables', t.deliverables);
  doc.field('Included revisions', `${t.included_revisions}${t.revision_definition ? `\n${t.revision_definition}` : ''}`);
  doc.field('Extra work', extraWork(t));
  doc.field('Work not included', t.excluded_work);
  doc.field('Payment terms (information only)', t.payment_terms_text);

  doc.rule();
  doc.heading('Approval record');
  if (approval && approval.approved_by_name) {
    const id = describeIdentity(approval);
    doc.paragraph(`Approved by ${approval.approved_by_name}${approval.approved_at ? ` on ${formatDateTime(approval.approved_at, tz)}` : ''}.`);
    doc.paragraph(`${id.label}: ${id.detail}`, { size: 9.5, color: [0.38, 0.43, 0.5] });
  } else {
    doc.paragraph('This version has no recorded approval.');
  }

  if (versions.length > 0) {
    doc.rule();
    doc.heading('Version history');
    for (const v of [...versions].sort((x, y) => x.number - y.number)) {
      doc.paragraph(`Version ${v.number}  |  ${formatDateTime(v.createdAt, tz)}  |  ${pdfMoney(v.amountMinor, a.currency)}  |  delivery ${formatPlainDate(v.deliveryDate)}`, { size: 9.5 });
    }
  }

  if (changes.length > 0) {
    doc.rule();
    doc.heading('Change requests');
    for (const ch of changes) {
      doc.paragraph(`${statusText(ch.status)}  |  ${formatDateTime(ch.createdAt, tz)}  |  price change ${pdfDelta(ch.priceDeltaMinor, a.currency)}`, { size: 9.5, bold: true });
      doc.paragraph(clip(ch.description, 400), { size: 9.5, indent: 8 });
      if (ch.decidedAt) doc.paragraph(`Decided ${formatDateTime(ch.decidedAt, tz)}${ch.decidedBy ? ` by ${ch.decidedBy}` : ''}.`, { size: 9, indent: 8, color: [0.38, 0.43, 0.5] });
      doc.gap(4);
    }
  }

  return doc.build(`Generated by AgreedLink on ${formatDateTime(input.generatedAt, tz)}. Not legal advice.`);
}

/** A safe ASCII file name such as agreement-logo-design-v2.pdf */
export function pdfFileName(projectName: string, version: number): string {
  const slug = projectName.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `agreement-${slug || 'record'}-v${version}.pdf`;
}
