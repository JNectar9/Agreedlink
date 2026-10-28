import { describe, expect, it } from 'vitest';
import { TEMPLATES, getTemplate } from '@/lib/templates';
import { parseAgreementForm } from '@/lib/validation';

describe('agreement templates', () => {
  it('has unique ids and can be looked up', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getTemplate('logo')?.name).toContain('Logo');
    expect(getTemplate('nope')).toBeUndefined();
  });

  it('produces a valid agreement once the required personal fields are filled in', () => {
    for (const t of TEMPLATES) {
      const result = parseAgreementForm({
        project_name: 'Test project',
        client_name: 'Test client',
        client_email: '',
        start_date: '',
        delivery_date: '2026-12-31',
        currency: 'NGN',
        amount: '50000',
        additional_work_price: '1000',
        ...t.values
      });
      expect(result.ok, `${t.id} should validate`).toBe(true);
    }
  });
});
