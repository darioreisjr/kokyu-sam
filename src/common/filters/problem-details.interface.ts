import { ErrorCode } from '../errors/error-codes';

/**
 * Error response shape, inspired by RFC 7807 Problem Details. This is a
 * stable public contract - do not change field names without a version
 * bump.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail: string;
  instance: string;
  requestId: string;
  /** RFC 7807 extension members (e.g. `redirectTo`, `missingFields`). */
  [extension: string]: unknown;
}
