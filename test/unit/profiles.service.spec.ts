import { describe, expect, it, vi } from 'vitest';
import { AvatarInvalidError, ProfileNotFoundError } from '../../src/common/errors/app.error';
import { ProfilesService } from '../../src/modules/profiles/profiles.service';
import { CurrentUserMapper } from '../../src/modules/profiles/services/current-user.mapper';
import { ProfileBootstrapService } from '../../src/modules/profiles/services/profile-bootstrap.service';
import { ProfileCompletionService } from '../../src/modules/profiles/services/profile-completion.service';
import { ProfilesRepository } from '../../src/modules/profiles/types/profiles-repository.interface';
import { Profile } from '../../src/modules/profiles/types/profile.type';
import { CurrentUserDto } from '../../src/modules/profiles/schemas/me-response.dto';
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
    profileBootstrappedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildLogger() {
  return { setContext: vi.fn(), info: vi.fn(), error: vi.fn() } as unknown as ConstructorParameters<
    typeof ProfilesService
  >[4];
}

function buildService(
  overrides: {
    repository?: Partial<ProfilesRepository>;
    bootstrapService?: Partial<ProfileBootstrapService>;
    completionService?: Partial<ProfileCompletionService>;
    mapper?: Partial<CurrentUserMapper>;
  } = {},
) {
  const repository: ProfilesRepository = {
    findByUserId: vi.fn().mockResolvedValue(buildProfile()),
    getOnboardingStatus: vi
      .fn()
      .mockResolvedValue({ onboardingCompletedAt: null, onboardingVersion: 0 }),
    bootstrap: vi.fn(),
    complete: vi.fn().mockResolvedValue(buildProfile()),
    update: vi.fn().mockResolvedValue(buildProfile()),
    isUsernameAvailable: vi.fn().mockResolvedValue(true),
    setAvatar: vi.fn().mockResolvedValue(buildProfile()),
    removeAvatar: vi.fn().mockResolvedValue(buildProfile()),
    createAvatarUploadUrl: vi
      .fn()
      .mockResolvedValue({ path: 'user-1/x.png', token: 'tok', signedUrl: 'https://upload' }),
    resolveAvatarUrl: vi.fn().mockResolvedValue(null),
    ...overrides.repository,
  };

  const bootstrapService = {
    maybeBootstrap: vi
      .fn()
      .mockImplementation((_user, profile: Profile) => Promise.resolve(profile)),
    ...overrides.bootstrapService,
  } as unknown as ProfileBootstrapService;

  const completionService = {
    isComplete: vi.fn().mockReturnValue(true),
    compute: vi.fn(),
    ...overrides.completionService,
  } as unknown as ProfileCompletionService;

  const expectedCurrentUser = { id: 'user-1' } as unknown as CurrentUserDto;
  const mapper = {
    map: vi.fn().mockReturnValue(expectedCurrentUser),
    ...overrides.mapper,
  } as unknown as CurrentUserMapper;

  const service = new ProfilesService(
    repository,
    bootstrapService,
    completionService,
    mapper,
    buildLogger(),
  );

  return { service, repository, bootstrapService, completionService, mapper, expectedCurrentUser };
}

describe('ProfilesService.getMe', () => {
  it('fetches the profile, runs bootstrap, resolves the avatar and maps to CurrentUser', async () => {
    const { service, repository, bootstrapService, mapper, expectedCurrentUser } = buildService();
    const user = buildAuthenticatedUser({ id: 'user-1' });

    const result = await service.getMe(user);

    expect(repository.findByUserId).toHaveBeenCalledWith('user-1', user.accessToken);
    expect(bootstrapService.maybeBootstrap).toHaveBeenCalledWith(user, buildProfile());
    expect(repository.resolveAvatarUrl).toHaveBeenCalled();
    expect(mapper.map).toHaveBeenCalled();
    expect(result).toBe(expectedCurrentUser);
  });

  it('throws ProfileNotFoundError when the trigger-created profile is missing', async () => {
    const { service } = buildService({
      repository: { findByUserId: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.getMe(buildAuthenticatedUser())).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});

describe('ProfilesService.isOnboardingComplete', () => {
  it('delegates to the lightweight onboarding-status query + ProfileCompletionService.isComplete', async () => {
    const status = { onboardingCompletedAt: '2026-01-01T00:00:00.000Z', onboardingVersion: 1 };
    const { service, repository, completionService } = buildService({
      repository: { getOnboardingStatus: vi.fn().mockResolvedValue(status) },
      completionService: { isComplete: vi.fn().mockReturnValue(true) },
    });
    const user = buildAuthenticatedUser({ id: 'user-1' });

    await expect(service.isOnboardingComplete(user)).resolves.toBe(true);
    expect(repository.getOnboardingStatus).toHaveBeenCalledWith('user-1', user.accessToken);
    expect(completionService.isComplete).toHaveBeenCalledWith(status);
  });

  it('throws ProfileNotFoundError when no profile row exists at all', async () => {
    const { service } = buildService({
      repository: { getOnboardingStatus: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.isOnboardingComplete(buildAuthenticatedUser())).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});

describe('ProfilesService.checkUsernameAvailability', () => {
  it('echoes the queried username alongside availability, never who owns it', async () => {
    const { service, repository } = buildService({
      repository: { isUsernameAvailable: vi.fn().mockResolvedValue(false) },
    });

    const result = await service.checkUsernameAvailability('taken');

    expect(repository.isUsernameAvailable).toHaveBeenCalledWith('taken');
    expect(result).toEqual({ username: 'taken', available: false });
  });
});

describe('ProfilesService.completeProfile / updateProfile', () => {
  const body = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    username: 'ada',
    birthDate: '1990-01-01',
    bio: null,
    countryCode: null,
    region: null,
    city: null,
  };

  it('completeProfile calls repository.complete with the mapped input', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser();

    await service.completeProfile(user, body);

    expect(repository.complete).toHaveBeenCalledWith(user.accessToken, body);
  });

  it('updateProfile calls repository.update with the mapped input', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser();

    await service.updateProfile(user, body);

    expect(repository.update).toHaveBeenCalledWith(user.accessToken, body);
  });
});

describe('ProfilesService.setAvatar', () => {
  it('persists a path that belongs to the caller', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser({ id: 'user-1' });

    await service.setAvatar(user, 'user-1/photo.png');

    expect(repository.setAvatar).toHaveBeenCalledWith(
      'user-1',
      user.accessToken,
      'user-1/photo.png',
    );
  });

  it('refuses a path that does not belong to the caller, even before hitting the repository', async () => {
    const { service, repository } = buildService();
    const user = buildAuthenticatedUser({ id: 'user-1' });

    await expect(service.setAvatar(user, 'someone-else/photo.png')).rejects.toBeInstanceOf(
      AvatarInvalidError,
    );
    expect(repository.setAvatar).not.toHaveBeenCalled();
  });
});
