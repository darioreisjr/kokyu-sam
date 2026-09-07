import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { ProfileCompleteGuard } from '../../src/common/auth/guards/profile-complete.guard';
import { ProfileSetupRequiredError } from '../../src/common/errors/app.error';
import { ProfilesService } from '../../src/modules/profiles/profiles.service';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildContext(user: unknown): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function buildReflector(metadata: { isPublic?: boolean; allowIncomplete?: boolean }): Reflector {
  return {
    getAllAndOverride: (key: string) => {
      if (key === 'isPublic') return metadata.isPublic;
      if (key === 'allowIncompleteProfile') return metadata.allowIncomplete;
      return undefined;
    },
  } as unknown as Reflector;
}

function buildProfilesService(isComplete: boolean): ProfilesService {
  return {
    isOnboardingComplete: vi.fn().mockResolvedValue(isComplete),
  } as unknown as ProfilesService;
}

describe('ProfileCompleteGuard', () => {
  it('allows a @Public() route without checking onboarding status', async () => {
    const service = buildProfilesService(false);
    const guard = new ProfileCompleteGuard(buildReflector({ isPublic: true }), service);

    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(true);
    expect(service.isOnboardingComplete).not.toHaveBeenCalled();
  });

  it('allows an @AllowIncompleteProfile() route even when onboarding is incomplete', async () => {
    const service = buildProfilesService(false);
    const guard = new ProfileCompleteGuard(buildReflector({ allowIncomplete: true }), service);
    const user = buildAuthenticatedUser();

    await expect(guard.canActivate(buildContext(user))).resolves.toBe(true);
    expect(service.isOnboardingComplete).not.toHaveBeenCalled();
  });

  it('blocks a regular business route when the profile is incomplete, with PROFILE_SETUP_REQUIRED + redirectTo', async () => {
    const service = buildProfilesService(false);
    const guard = new ProfileCompleteGuard(buildReflector({}), service);
    const user = buildAuthenticatedUser();

    const promise = guard.canActivate(buildContext(user));

    await expect(promise).rejects.toBeInstanceOf(ProfileSetupRequiredError);
    await promise.catch((error: ProfileSetupRequiredError) => {
      expect(error.extra).toEqual({ redirectTo: '/perfil/completar' });
    });
  });

  it('allows a regular business route through when the profile is complete', async () => {
    const service = buildProfilesService(true);
    const guard = new ProfileCompleteGuard(buildReflector({}), service);
    const user = buildAuthenticatedUser();

    await expect(guard.canActivate(buildContext(user))).resolves.toBe(true);
  });

  it('allows through defensively when somehow there is no user on a non-public route', async () => {
    const service = buildProfilesService(false);
    const guard = new ProfileCompleteGuard(buildReflector({}), service);

    await expect(guard.canActivate(buildContext(undefined))).resolves.toBe(true);
    expect(service.isOnboardingComplete).not.toHaveBeenCalled();
  });
});
