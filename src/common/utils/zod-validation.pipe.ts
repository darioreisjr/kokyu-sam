import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodType } from 'zod';

/**
 * Generic Zod-backed validation pipe. Zod is the single validation
 * strategy used across the API (no class-validator) - see
 * docs/architecture.md.
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException(this.formatError(result.error));
    }

    return result.data;
  }

  private formatError(error: ZodError): string {
    return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
  }
}
