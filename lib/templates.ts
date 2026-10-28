// Starter templates prefill the new-agreement form. They are plain starting text, not legal advice.
export type TemplateValues = {
  description?: string;
  deliverables?: string;
  included_revisions?: number;
  revision_definition?: string;
  excluded_work?: string;
  additional_work_pricing?: 'quote_first' | 'hourly' | 'fixed_per_item';
  payment_terms_text?: string;
};

export type Template = { id: string; name: string; summary: string; values: TemplateValues };

export const TEMPLATES: Template[] = [
  {
    id: 'logo',
    name: 'Logo and brand identity',
    summary: 'Logo design with a set number of revisions and clear exclusions.',
    values: {
      description: 'Design of a logo and basic brand identity for the client.',
      deliverables: 'Primary logo\nColour palette\nLogo files in PNG and SVG',
      included_revisions: 2,
      revision_definition: 'A revision is a change to an existing concept. A new concept or a new direction counts as additional work.',
      excluded_work: 'Packaging, printed materials, website design, trademark registration',
      additional_work_pricing: 'quote_first',
      payment_terms_text: 'Half before work begins and half before final files are delivered.'
    }
  },
  {
    id: 'website',
    name: 'Website design',
    summary: 'Small website with a page count, revisions, and content responsibilities.',
    values: {
      description: 'Design and build of a small business website.',
      deliverables: 'Up to 5 pages\nMobile-friendly layout\nContact form',
      included_revisions: 2,
      revision_definition: 'A revision is a change to existing pages after the first full draft. New pages or new features count as additional work.',
      excluded_work: 'Writing page content, photography, hosting fees, ongoing maintenance',
      additional_work_pricing: 'hourly',
      payment_terms_text: 'Half before work begins and half on delivery.'
    }
  },
  {
    id: 'photo',
    name: 'Photography or video',
    summary: 'A shoot with edited deliverables and a delivery date.',
    values: {
      description: 'Photography session with edited images delivered digitally.',
      deliverables: 'Edited images delivered by online gallery or download link',
      included_revisions: 1,
      revision_definition: 'A revision is a change to the editing of delivered images. Extra shoots or locations count as additional work.',
      excluded_work: 'Printing, albums, travel outside the agreed location',
      additional_work_pricing: 'quote_first',
      payment_terms_text: 'A deposit secures the date, and the balance is due before delivery.'
    }
  },
  {
    id: 'custom',
    name: 'Custom product or service',
    summary: 'For tailoring, event decoration, or any custom order.',
    values: {
      description: 'Custom product or service made to the client\'s specification.',
      deliverables: 'Describe what will be delivered, quantities, and sizes or measurements',
      included_revisions: 1,
      revision_definition: 'A revision is a small adjustment to the agreed specification. Changes to materials, size, or design count as additional work.',
      excluded_work: 'Anything not listed under deliverables',
      additional_work_pricing: 'fixed_per_item',
      payment_terms_text: 'A deposit before work begins and the balance on delivery.'
    }
  }
];

export function getTemplate(id: string | undefined): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
