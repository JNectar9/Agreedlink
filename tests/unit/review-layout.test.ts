import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PILL_CLASS, agreementPill, kindLabel, reviewSubtitle, splitDeliverables, uploadHint } from '@/lib/review-layout';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('layout helpers', () => {
  it('turns a deliverables list into check items and strips bullets and numbers', () => {
    expect(splitDeliverables('Primary logo design\nBrand colour palette\nPNG and SVG files')).toEqual(['Primary logo design', 'Brand colour palette', 'PNG and SVG files']);
    expect(splitDeliverables('- One\n* Two\n\u2022 Three\n4. Four\n5) Five')).toEqual(['One', 'Two', 'Three', 'Four', 'Five']);
    expect(splitDeliverables('\n  \n')).toEqual([]);
    expect(splitDeliverables('A single paragraph of text.')).toEqual(['A single paragraph of text.']);
  });
  it('shows the real agreement status, never an invented one', () => {
    expect(agreementPill('awaiting_approval')).toEqual({ text: 'Awaiting approval', tone: 'warn' });
    expect(agreementPill('approved').tone).toBe('ok');
    expect(agreementPill('declined').tone).toBe('bad');
    expect(agreementPill('something_new').text).toBe('In progress');
    for (const tone of ['ok', 'warn', 'bad', 'muted'] as const) expect(PILL_CLASS[tone].length > 0).toBe(true);
  });
  it('labels file kinds and the subtitle honestly', () => {
    expect(kindLabel('image', 'PNG image')).toBe('Image');
    expect(kindLabel('pdf', 'PDF')).toBe('PDF');
    expect(kindLabel('other', 'Word document')).toBe('Word document');
    expect(reviewSubtitle(2)).toContain('attached files');
    expect(reviewSubtitle(0)).not.toContain('attached files');
  });
  it('lists the file types that are really allowed, with the real size limit', () => {
    expect(uploadHint(10 * 1024 * 1024)).toContain('Max 10 MB');
    expect(uploadHint(50 * 1024 * 1024)).toContain('Max 50 MB');
    expect(uploadHint(10 * 1024 * 1024)).toContain('PDF');
  });
});

describe('attachments page keeps every existing function', () => {
  const page = read('app/dashboard/agreements/[id]/attachments/page.tsx');
  const card = read('components/AttachmentCard.tsx');
  const up = read('components/AttachmentUploader.tsx');
  it('still reads limits, files, approval records and thumbnails, and gates by plan', () => {
    for (const s of ["rpc('my_attachment_limits')", "from('agreement_attachments')", "from('approval_file_records')", "from('approval_attachment_snapshots')", 'createSignedUrls', 'See plans on Billing', 'Files recorded at approval']) expect(page).toContain(s);
  });
  it('card keeps preview, download, make private, rename and delete using the same actions', () => {
    for (const s of ['changeVisibilityFormAction', 'renameAttachmentFormAction', 'deleteAttachmentAction', '/download?inline=1', 'Make private', 'Show to customer', 'Rename', 'Delete']) expect(card).toContain(s);
  });
  it('matches the design: back link, title, count pill, drop box, status pill', () => {
    expect(page).toContain('Back to agreement');
    expect(page).toContain('Manage files attached to this agreement.');
    expect(page).toContain('Your attachments');
    expect(page).toContain('Your agreement files and documents');
    expect(up).toContain('Choose files');
    expect(up).toContain('or drag and drop here');
    expect(up).toContain('border-dashed');
  });
  it('upload still checks limits first and marks private files before uploading', () => {
    expect(up).toContain('checkFileChoice');
    expect(up).toContain('Keep this file private (only me)');
    expect(up.indexOf('setVisibilityAction(begin.id, false)')).toBeLessThan(up.indexOf('uploadToSignedUrl'));
    expect(up).toContain('multiple');
    expect(up).toContain('onDrop');
  });
});

describe('customer approval page keeps every existing function', () => {
  const page = read('app/a/[token]/page.tsx');
  const files = read('components/CustomerFiles.tsx');
  it('still loads the agreement and files only through the database functions', () => {
    expect(page).toContain("rpc('customer_get'");
    expect(page).toContain("rpc('customer_files'");
    expect(page).not.toContain("from('agreement_attachments')");
    expect(files).not.toContain('createClient');
  });
  it('still records approve, request changes and decline through the same action, with the name field', () => {
    expect(page).toContain('<form action={decideAgreementAction.bind(null, token)}');
    expect(page).toContain('value="approve"');
    expect(page).toContain('value="clarify"');
    expect(page).toContain('value="decline"');
    expect(page).toContain('name="name" required');
    expect(page).toContain('<OpenBeacon token={token} />');
    expect(page.indexOf('<CustomerFiles')).toBeLessThan(page.indexOf('<form action={decideAgreementAction'));
  });
  it('keeps the change proposal flow, the identity notes and the legal footer', () => {
    for (const s of ['decideChangeAction', 'ComparisonTable', 'IdentityNote', 'Your identity is not verified', 'does not verify identities, hold payments, or guarantee legal enforceability', 'Created by JNectar']) expect(page).toContain(s);
  });
  it('matches the design: secure link badge, headings, sections and button labels', () => {
    const expected = [
      'Secure link', 'Review your agreement', 'Project information', 'Service provider', 'Agreed price', 'Delivery date',
      'Work and deliverables', 'Your decision', 'Approve agreement', 'Request changes', 'Decline agreement', 'Agreement managed with AgreedLink'
    ];
    for (const s of expected) expect(page).toContain(s);
    expect(files).toContain('Files shared with you');
    expect(files).toContain('Shared with you');
    expect(files).toContain('View full size file');
  });
  it('still shows every term the customer agrees to', () => {
    for (const s of ['t.description', 't.included_revisions', 'pricingLabel(t)', 't.revision_definition', 't.excluded_work', 't.payment_terms_text', 'money(t.amount_minor)', 'formatPlainDate(t.delivery_date)']) expect(page).toContain(s);
  });
});
