import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthRequiredError, TokenExpiredError, TokenInvalidError } from '../../errors/app.error';
import { SupabaseClientFactoryService } from '../../../infrastructure/supabase/supabase-client.factory.service';
import { mapClaimsToAuthenticatedUser } from '../../../modules/auth/services/auth-claims.mapper';
import { SupabaseJwtClaims } from '../../../modules/auth/types/supabase-jwt-claims.type';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../types/authenticated-user.type';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

const BEARER_PREFIX = 'Bearer ';

/**
 * Global authentication guard. Every route is private unless annotated
 * with `@Public()`. Responsibilities are intentionally narrow: locate the
 * bearer token, verify it against Supabase (signature + exp + required
 * claims), and attach an AuthenticatedUser to the request. It does not
 * know anything about Profiles or business authorization.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseClientFactoryService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(request);
    const claims = await this.verifyToken(token);

    request.user = mapClaimsToAuthenticatedUser(claims, token);
    return true;
  }

  private extractBearerToken(request: Request): string {
    const header = request.headers.authorization;

    if (!header || !header.startsWith(BEARER_PREFIX)) {
      throw new AuthRequiredError();
    }

    const token = header.slice(BEARER_PREFIX.length).trim();

    if (!token) {
      throw new AuthRequiredError();
    }

    return token;
  }

  private async verifyToken(token: string): Promise<SupabaseJwtClaims> {
    const client = this.supabase.getPublicClient();

    // Verifies the signature against Supabase's JWKS (with key caching and
    // rotation handled by the SDK) and validates standard claims such as
    // `exp`. We deliberately avoid a bare jwt.decode() here.
    const { data, error } = await client.auth.getClaims(token);

    if (error) {
      if (/expired/i.test(error.message)) {
        throw new TokenExpiredError();
      }
      throw new TokenInvalidError();
    }

    const claims = data?.claims as SupabaseJwtClaims | undefined;

    if (!claims?.sub) {
      throw new TokenInvalidError();
    }

    if (typeof claims.exp === 'number' && claims.exp * 1000 < Date.now()) {
      throw new TokenExpiredError();
    }

    return claims;
  }
}
