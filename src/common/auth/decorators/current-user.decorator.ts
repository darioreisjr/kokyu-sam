import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../types/authenticated-user.type';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Injects the AuthenticatedUser attached by SupabaseAuthGuard. Only usable
 * on routes protected by the guard (i.e. not `@Public()`) - on a public
 * route this will be `undefined`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
