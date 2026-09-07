import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ProfileSetupRequiredError } from '../../errors/app.error';
import { ProfilesService } from '../../../modules/profiles/profiles.service';
import { ALLOW_INCOMPLETE_PROFILE_KEY } from '../decorators/allow-incomplete-profile.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../types/authenticated-user.type';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

/**
 * Global guard, registered *after* SupabaseAuthGuard (see app.module.ts -
 * order is Throttler -> SupabaseAuth -> ProfileComplete). Gates access to
 * every business route on the caller's Kokyu profile being complete, on
 * top of Supabase Auth already having verified who they are. Auth and
 * Profile are different concepts (see docs/profile-onboarding.md): a
 * request can be authenticated and still be refused here.
 *
 * Any future controller is protected automatically with zero extra work -
 * the only opt-outs are `@Public()` (no user at all) and
 * `@AllowIncompleteProfile()` (authenticated, but the route itself is part
 * of the onboarding flow, e.g. POST /profile/complete).
 */
@Injectable()
export class ProfileCompleteGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly profilesService: ProfilesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const allowIncomplete = this.reflector.getAllAndOverride<boolean>(
      ALLOW_INCOMPLETE_PROFILE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowIncomplete) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Defensive only: SupabaseAuthGuard runs first and would already have
    // thrown for a non-public route with no user, so this should be
    // unreachable in practice.
    if (!user) {
      return true;
    }

    const isComplete = await this.profilesService.isOnboardingComplete(user);
    if (!isComplete) {
      throw new ProfileSetupRequiredError();
    }

    return true;
  }
}
