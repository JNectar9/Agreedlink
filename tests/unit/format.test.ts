import { describe, expect, it } from 'vitest';
import { pluralize } from '@/lib/format';
import { fitWithin } from '@/lib/image-size';

describe('pluralize', () => {
  it('uses the singular only for exactly one', () => {
    expect(`Peak: 1 ${pluralize(1, 'agreement')}`).toBe('Peak: 1 agreement');
    expect(pluralize(0, 'agreement')).toBe('agreements');
    expect(pluralize(3, 'agreement')).toBe('agreements');
    expect(pluralize(2, 'user')).toBe('users');
  });
});

describe('fitWithin', () => {
  it('scales large photos down and keeps the aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
    expect(fitWithin(3000, 4000, 1024)).toEqual({ width: 768, height: 1024 });
  });

  it('never scales small photos up', () => {
    expect(fitWithin(500, 400, 1024)).toEqual({ width: 500, height: 400 });
  });
});
