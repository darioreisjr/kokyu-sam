import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ZodValidationPipe } from '../../src/common/utils/zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({ username: z.string().min(3) });
  const metadata = { type: 'body' as const };

  it('returns the parsed value when it satisfies the schema', () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ username: 'ada' }, metadata)).toEqual({ username: 'ada' });
  });

  it('throws BadRequestException with a readable message when validation fails', () => {
    const pipe = new ZodValidationPipe(schema);

    try {
      pipe.transform({ username: 'ab' }, metadata);
      throw new Error('expected transform to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { message: string };
      expect(response.message).toContain('username');
    }
  });
});
