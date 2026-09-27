import { HttpStatus } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ErrorCode } from '../errors/error-codes';
import { ProblemDetails } from '../filters/problem-details.interface';
import { isOriginAllowed } from '../utils/cors-origin.util';

/**
 * Answers a browser request from an origin outside the CORS allowlist
 * with a 403 in the API's usual Problem Details shape - and no
 * Access-Control-Allow-Origin, so the browser still blocks it.
 *
 * Registered before the `cors` middleware on purpose: signalling a
 * disallowed origin through `cors`'s own callback raised an error from an
 * Express middleware, which never reached Nest's exception filter and
 * came back as a bare 500. Requests without an Origin header
 * (server-to-server, health checks, curl) are never affected.
 */
export function rejectDisallowedOrigin(allowlist: readonly string[]) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const origin = request.headers.origin;
    if (!origin || isOriginAllowed(origin, allowlist)) {
      next();
      return;
    }

    const requestIdHeader = request.headers['x-request-id'];
    const problem: ProblemDetails = {
      type: `https://docs.kokyu.app/errors/${ErrorCode.CORS_ORIGIN_FORBIDDEN}`,
      title: 'Origin not allowed',
      status: HttpStatus.FORBIDDEN,
      code: ErrorCode.CORS_ORIGIN_FORBIDDEN,
      detail: 'This origin is not allowed to call the API.',
      instance: request.originalUrl,
      requestId: typeof requestIdHeader === 'string' ? requestIdHeader : '',
    };
    response.status(HttpStatus.FORBIDDEN).json(problem);
  };
}
