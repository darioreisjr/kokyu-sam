import { describe, expect, it } from 'vitest';
import { ProfileCompletionService } from '../../src/modules/profiles/services/profile-completion.service';
import { Profile } from '../../src/modules/profiles/types/profile.type';

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

describe('ProfileCompletionService.compute', () => {
  const service = new ProfileCompletionService();

  it('is complete when every required field is present and onboarding_completed_at is set', () => {
    const result = service.compute(buildProfile());

    expect(result).toEqual({
      completed: true,
      completedAt: '2026-01-01T00:00:00.000Z',
      version: 1,
      missingFields: [],
    });
  });

  it.each([
    ['firstName', { firstName: null }],
    ['lastName', { lastName: null }],
    ['username', { username: null }],
    ['birthDate', { birthDate: null }],
  ] as const)('reports %s as missing when it is null', (field, overrides) => {
    const result = service.compute(buildProfile(overrides));

    expect(result.completed).toBe(false);
    expect(result.missingFields).toContain(field);
    expect(result.completedAt).toBeNull();
  });

  it('reports every missing required field at once', () => {
    const result = service.compute(
      buildProfile({ firstName: null, lastName: null, username: null, birthDate: null }),
    );

    expect(result.missingFields).toEqual(['firstName', 'lastName', 'username', 'birthDate']);
  });

  it('is not complete when onboarding_completed_at is null even if fields are present', () => {
    const result = service.compute(buildProfile({ onboardingCompletedAt: null }));

    expect(result.completed).toBe(false);
    expect(result.completedAt).toBeNull();
  });

  it('is not complete when onboarding_version is behind the current version', () => {
    const result = service.compute(buildProfile({ onboardingVersion: 0 }));

    expect(result.completed).toBe(false);
  });
});

describe('ProfileCompletionService.isComplete (lightweight guard check)', () => {
  const service = new ProfileCompletionService();

  it('true when completed_at is set and version is current', () => {
    expect(
      service.isComplete({
        onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
        onboardingVersion: 1,
      }),
    ).toBe(true);
  });

  it('false when completed_at is null', () => {
    expect(service.isComplete({ onboardingCompletedAt: null, onboardingVersion: 1 })).toBe(false);
  });

  it('false when version is behind', () => {
    expect(
      service.isComplete({
        onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
        onboardingVersion: 0,
      }),
    ).toBe(false);
  });
});
