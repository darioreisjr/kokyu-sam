import { describe, expect, it } from 'vitest';
import { CurrentUserMapper } from '../../src/modules/profiles/services/current-user.mapper';
import { ProfileCompletionService } from '../../src/modules/profiles/services/profile-completion.service';
import { Profile } from '../../src/modules/profiles/types/profile.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    username: 'ada',
    birthDate: '1990-01-01',
    bio: null,
    avatarPath: null,
    avatarExternalUrl: null,
    countryCode: null,
    region: null,
    city: null,
    onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
    onboardingVersion: 1,
    profileBootstrappedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CurrentUserMapper.map', () => {
  const mapper = new CurrentUserMapper(new ProfileCompletionService());

  it('combines user + profile + resolved avatar into the CurrentUser contract, completed case', () => {
    const user = buildAuthenticatedUser({
      id: 'user-1',
      provider: 'google',
      providers: ['google'],
    });

    const result = mapper.map(user, buildProfile(), 'https://signed-avatar');

    expect(result).toEqual({
      id: 'user-1',
      email: user.email,
      emailVerified: true,
      providers: ['google'],
      profile: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        username: 'ada',
        birthDate: '1990-01-01',
        bio: null,
        avatarUrl: 'https://signed-avatar',
        countryCode: null,
        region: null,
        city: null,
      },
      profileCompletion: {
        completed: true,
        completedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        missingFields: [],
      },
      access: { canUseApplication: true, redirectTo: null },
    });
  });

  it('reports incomplete access + redirectTo when required fields are missing', () => {
    const user = buildAuthenticatedUser({ id: 'user-1' });
    const profile = buildProfile({ username: null, onboardingCompletedAt: null });

    const result = mapper.map(user, profile, null);

    expect(result.profileCompletion.completed).toBe(false);
    expect(result.profileCompletion.missingFields).toContain('username');
    expect(result.access).toEqual({ canUseApplication: false, redirectTo: '/perfil/completar' });
    expect(result.profile.avatarUrl).toBeNull();
  });

  it('never includes the access token or user metadata in the mapped response', () => {
    const user = buildAuthenticatedUser({
      userMetadata: { picture: 'https://secret-looking-url' },
    });

    const result = mapper.map(user, buildProfile(), null);

    expect(JSON.stringify(result)).not.toContain(user.accessToken);
    expect(JSON.stringify(result)).not.toContain('secret-looking-url');
  });
});
