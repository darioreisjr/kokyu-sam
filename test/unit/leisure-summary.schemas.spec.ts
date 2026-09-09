import { describe, expect, it } from 'vitest';
import { summaryQuerySchema } from '../../src/modules/leisure/schemas/leisure-summary.schemas';

describe('summaryQuerySchema', () => {
  it('accepts a valid YYYY-MM-DD date', () => {
    expect(summaryQuerySchema.safeParse({ date: '2026-01-01' }).success).toBe(true);
  });

  it('rejects a malformed date', () => {
    expect(summaryQuerySchema.safeParse({ date: '01/01/2026' }).success).toBe(false);
  });

  it('rejects a missing date', () => {
    expect(summaryQuerySchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown keys (strict)', () => {
    expect(summaryQuerySchema.safeParse({ date: '2026-01-01', extra: 1 }).success).toBe(false);
  });
});
