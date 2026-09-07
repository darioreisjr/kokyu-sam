import { describe, expect, it, vi } from 'vitest';
import { UsernameTakenError } from '../../src/common/errors/app.error';
import { ProfileBootstrapService } from '../../src/modules/profiles/services/profile-bootstrap.service';
import { ProfilesRepository } from '../../src/modules/profiles/types/profiles-repository.interface';
import { Profile } from '../../src/modules/profiles/types/profile.type';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildEmptyProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    firstName: null,
    lastName: null,
    username: null,
    birthDate: null,
    bio: null,
    avatarPath: null,
    avatarExternalUrl: null,
    countryCode: null,
    region: null,
    city: null,
    onboardingCompletedAt: null,
    onboardingVersion: 0,
    profileBootstrappedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildLogger() {
  return { setContext: vi.fn(), info: vi.fn(), error: vi.fn() } as unknown as ConstructorParameters<
    typeof ProfileBootstrapService
  >[1];
}

function buildService(repositoryOverrides: Partial<ProfilesRepository> = {}) {
  const repository: ProfilesRepository = {
    findByUserId: vi.fn(),
    getOnboardingStatus: vi.fn(),
    bootstrap: vi
      .fn()
      .mockImplementation((_id, _token, patch) =>
        Promise.resolve(
          buildEmptyProfile({ ...patchToProfileOverrides(patch), profileBootstrappedAt: 'now' }),
        ),
      ),
    complete: vi.fn(),
    update: vi.fn(),
    isUsernameAvailable: vi.fn(),
    setAvatar: vi.fn(),
    removeAvatar: vi.fn(),
    createAvatarUploadUrl: vi.fn(),
    resolveAvatarUrl: vi.fn(),
    ...repositoryOverrides,
  };

  const service = new ProfileBootstrapService(repository, buildLogger());
  return { service, repository };
}

function patchToProfileOverrides(patch: Record<string, unknown>): Partial<Profile> {
  const overrides: Partial<Profile> = {};
  if (typeof patch.firstName === 'string') overrides.firstName = patch.firstName;
  if (typeof patch.lastName === 'string') overrides.lastName = patch.lastName;
  if (typeof patch.username === 'string') overrides.username = patch.username;
  if (typeof patch.birthDate === 'string') overrides.birthDate = patch.birthDate;
  if (typeof patch.avatarExternalUrl === 'string')
    overrides.avatarExternalUrl = patch.avatarExternalUrl;
  return overrides;
}

describe('ProfileBootstrapService.maybeBootstrap - email signup metadata', () => {
  it('fills first_name/last_name/username/birth_date from user_metadata', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser({
      userMetadata: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        username: 'ada_lovelace',
        birth_date: '1990-01-01',
      },
    });

    await service.maybeBootstrap(user, buildEmptyProfile());

    expect(repository.bootstrap).toHaveBeenCalledWith(
      user.id,
      user.accessToken,
      expect.objectContaining({
        firstName: 'Ada',
        lastName: 'Lovelace',
        username: 'ada_lovelace',
        birthDate: '1990-01-01',
      }),
    );
  });
});

describe('ProfileBootstrapService.maybeBootstrap - Google identity metadata', () => {
  it('maps given_name/family_name and picture -> avatarExternalUrl', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser({
      provider: 'google',
      userMetadata: {
        given_name: 'Grace',
        family_name: 'Hopper',
        picture: 'https://google.example/pic.png',
      },
    });

    await service.maybeBootstrap(user, buildEmptyProfile());

    expect(repository.bootstrap).toHaveBeenCalledWith(
      user.id,
      user.accessToken,
      expect.objectContaining({
        firstName: 'Grace',
        lastName: 'Hopper',
        avatarExternalUrl: 'https://google.example/pic.png',
      }),
    );
  });

  it('falls back to splitting a full "name" when given_name/family_name are absent', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser({ userMetadata: { name: 'Margaret Hamilton' } });

    await service.maybeBootstrap(user, buildEmptyProfile());

    expect(repository.bootstrap).toHaveBeenCalledWith(
      user.id,
      user.accessToken,
      expect.objectContaining({ firstName: 'Margaret', lastName: 'Hamilton' }),
    );
  });
});

describe('ProfileBootstrapService.maybeBootstrap - never overwrites existing values', () => {
  it('does not touch fields that already have a value', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser({
      userMetadata: { first_name: 'Someone Else', username: 'someone_else' },
    });
    const profile = buildEmptyProfile({ firstName: 'Ada', username: 'ada' });

    await service.maybeBootstrap(user, profile);

    const [, , patch] = (repository.bootstrap as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(patch.firstName).toBeUndefined();
    expect(patch.username).toBeUndefined();
  });

  it('is a no-op (no repository write beyond the initial stamp) once already bootstrapped with data present', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser();
    const profile = buildEmptyProfile({
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      birthDate: '1990-01-01',
      profileBootstrappedAt: '2026-01-01T00:00:00.000Z',
    });

    const result = await service.maybeBootstrap(user, profile);

    expect(repository.bootstrap).not.toHaveBeenCalled();
    expect(result).toBe(profile);
  });
});

describe('ProfileBootstrapService.maybeBootstrap - invalid/missing metadata is ignored, never blocks', () => {
  it('leaves fields null when metadata is missing entirely', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser({ userMetadata: {} });

    await service.maybeBootstrap(user, buildEmptyProfile());

    const [, , patch] = (repository.bootstrap as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(patch).toEqual({});
  });

  it('ignores an invalid username (leaves it null) rather than persisting garbage', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser({ userMetadata: { username: '_invalid' } });

    await service.maybeBootstrap(user, buildEmptyProfile());

    const [, , patch] = (repository.bootstrap as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(patch.username).toBeUndefined();
  });

  it('ignores an invalid/underage birth_date (leaves it null)', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser({ userMetadata: { birth_date: '2020-01-01' } });

    await service.maybeBootstrap(user, buildEmptyProfile());

    const [, , patch] = (repository.bootstrap as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(patch.birthDate).toBeUndefined();
  });

  it('retries once without the username on a uniqueness race, without failing the caller', async () => {
    const bootstrap = vi
      .fn()
      .mockRejectedValueOnce(new UsernameTakenError())
      .mockResolvedValueOnce(buildEmptyProfile({ firstName: 'Ada', profileBootstrappedAt: 'now' }));
    const { service } = buildService({ bootstrap });
    const user = buildAuthenticatedUser({ userMetadata: { first_name: 'Ada', username: 'ada' } });

    const result = await service.maybeBootstrap(user, buildEmptyProfile());

    expect(bootstrap).toHaveBeenCalledTimes(2);
    const secondCallPatch = bootstrap.mock.calls[1]?.[2] as Record<string, unknown>;
    expect(secondCallPatch.username).toBeUndefined();
    expect(result.firstName).toBe('Ada');
  });
});
