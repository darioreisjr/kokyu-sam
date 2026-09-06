import { describe, expect, it, vi } from 'vitest';
import { ProfileNotFoundError } from '../../src/common/errors/app.error';
import { ProfilesService } from '../../src/modules/profiles/profiles.service';
import { ProfilesRepository } from '../../src/modules/profiles/types/profiles-repository.interface';
import { Profile } from '../../src/modules/profiles/types/profile.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    username: 'ada',
    birthDate: '1990-01-01',
    avatarUrl: null,
    onboardingComplete: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProfilesService.getMe', () => {
  it('combines the authenticated user and profile into the /me response shape', async () => {
    const repository: ProfilesRepository = {
      findById: vi.fn().mockResolvedValue(buildProfile()),
    };
    const service = new ProfilesService(repository);
    const user = buildAuthenticatedUser({ id: 'user-1', provider: 'google' });

    const result = await service.getMe(user);

    expect(repository.findById).toHaveBeenCalledWith('user-1', user.accessToken);
    expect(result).toEqual({
      user: {
        id: 'user-1',
        email: user.email,
        emailVerified: true,
        provider: 'google',
      },
      profile: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        username: 'ada',
        birthDate: '1990-01-01',
        avatarUrl: null,
        onboardingComplete: true,
      },
    });
  });

  it('never leaks the access token in the response', async () => {
    const repository: ProfilesRepository = {
      findById: vi.fn().mockResolvedValue(buildProfile()),
    };
    const service = new ProfilesService(repository);
    const user = buildAuthenticatedUser();

    const result = await service.getMe(user);

    expect(JSON.stringify(result)).not.toContain(user.accessToken);
  });

  it('throws ProfileNotFoundError when the trigger-created profile is missing', async () => {
    const repository: ProfilesRepository = {
      findById: vi.fn().mockResolvedValue(null),
    };
    const service = new ProfilesService(repository);

    await expect(service.getMe(buildAuthenticatedUser())).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});
