import { describe, expect, it, vi } from 'vitest';
import { ProfileNotFoundError, UsernameTakenError } from '../../src/common/errors/app.error';
import { SupabaseProfilesRepository } from '../../src/modules/profiles/profiles.repository';
import { Profile } from '../../src/modules/profiles/types/profile.type';

function buildProfileRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    username: 'ada',
    birth_date: '1990-01-01',
    bio: null,
    avatar_path: null,
    avatar_external_url: null,
    country_code: null,
    region: null,
    city: null,
    onboarding_completed_at: '2026-01-01T00:00:00.000Z',
    onboarding_version: 1,
    profile_bootstrapped_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildExpectedProfile(overrides: Partial<Profile> = {}): Profile {
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

type SupabaseArg = ConstructorParameters<typeof SupabaseProfilesRepository>[0];

function buildRepositoryWithUserScopedClient(client: unknown): SupabaseProfilesRepository {
  const supabase = { getUserScopedClient: () => client } as unknown as SupabaseArg;
  return new SupabaseProfilesRepository(supabase);
}

function buildRepositoryWithPublicClient(client: unknown): SupabaseProfilesRepository {
  const supabase = { getPublicClient: () => client } as unknown as SupabaseArg;
  return new SupabaseProfilesRepository(supabase);
}

describe('SupabaseProfilesRepository.findByUserId', () => {
  it('maps a database row into the domain Profile shape', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: buildProfileRow(), error: null }),
          }),
        }),
      }),
    };
    const repository = buildRepositoryWithUserScopedClient(client);

    const profile = await repository.findByUserId('user-1', 'token');

    expect(profile).toEqual(buildExpectedProfile());
  });

  it('returns null when no row is found', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
    };
    const repository = buildRepositoryWithUserScopedClient(client);

    await expect(repository.findByUserId('missing-user', 'token')).resolves.toBeNull();
  });

  it('maps PGRST116 specifically to ProfileNotFoundError', async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } }),
          }),
        }),
      }),
    };
    const repository = buildRepositoryWithUserScopedClient(client);

    await expect(repository.findByUserId('user-1', 'token')).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});

describe('SupabaseProfilesRepository.getOnboardingStatus', () => {
  it('selects only the two completion columns', async () => {
    const eq = vi.fn(() => ({
      maybeSingle: () =>
        Promise.resolve({
          data: { onboarding_completed_at: '2026-01-01T00:00:00.000Z', onboarding_version: 1 },
          error: null,
        }),
    }));
    const select = vi.fn(() => ({ eq }));
    const client = { from: () => ({ select }) };
    const repository = buildRepositoryWithUserScopedClient(client);

    const status = await repository.getOnboardingStatus('user-1', 'token');

    expect(select).toHaveBeenCalledWith('onboarding_completed_at, onboarding_version');
    expect(status).toEqual({
      onboardingCompletedAt: '2026-01-01T00:00:00.000Z',
      onboardingVersion: 1,
    });
  });
});

describe('SupabaseProfilesRepository.complete/update', () => {
  it('calls the complete_profile RPC and maps the returned row', async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: buildProfileRow(), error: null }));
    const client = { rpc };
    const repository = buildRepositoryWithUserScopedClient(client);

    const profile = await repository.complete('token', {
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      birthDate: '1990-01-01',
      bio: null,
      countryCode: null,
      region: null,
      city: null,
    });

    expect(rpc).toHaveBeenCalledWith(
      'complete_profile',
      expect.objectContaining({ p_first_name: 'Ada', p_username: 'ada' }),
    );
    expect(profile).toEqual(buildExpectedProfile());
  });

  it('maps a unique_violation from complete_profile to UsernameTakenError', async () => {
    const client = {
      rpc: () =>
        Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }),
    };
    const repository = buildRepositoryWithUserScopedClient(client);

    await expect(
      repository.complete('token', {
        firstName: 'Ada',
        lastName: 'Lovelace',
        username: 'taken',
        birthDate: '1990-01-01',
        bio: null,
        countryCode: null,
        region: null,
        city: null,
      }),
    ).rejects.toBeInstanceOf(UsernameTakenError);
  });

  it('calls the update_profile RPC', async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: buildProfileRow({ bio: 'hi' }), error: null }));
    const client = { rpc };
    const repository = buildRepositoryWithUserScopedClient(client);

    const profile = await repository.update('token', {
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      birthDate: '1990-01-01',
      bio: 'hi',
      countryCode: null,
      region: null,
      city: null,
    });

    expect(rpc).toHaveBeenCalledWith('update_profile', expect.any(Object));
    expect(profile.bio).toBe('hi');
  });
});

describe('SupabaseProfilesRepository.isUsernameAvailable', () => {
  it('uses the public client (works for an unauthenticated caller)', async () => {
    const rpc = vi.fn(() => Promise.resolve({ data: true, error: null }));
    const repository = buildRepositoryWithPublicClient({ rpc });

    const available = await repository.isUsernameAvailable('brand_new');

    expect(rpc).toHaveBeenCalledWith('is_username_available', { p_username: 'brand_new' });
    expect(available).toBe(true);
  });
});

describe('SupabaseProfilesRepository.resolveAvatarUrl', () => {
  it('prefers a signed URL for avatar_path over avatar_external_url', async () => {
    const client = {
      storage: {
        from: () => ({
          createSignedUrl: () =>
            Promise.resolve({ data: { signedUrl: 'https://signed' }, error: null }),
        }),
      },
    };
    const repository = buildRepositoryWithUserScopedClient(client);
    const profile = buildExpectedProfile({
      avatarPath: 'user-1/pic.png',
      avatarExternalUrl: 'https://google.example/pic.png',
    });

    await expect(repository.resolveAvatarUrl(profile, 'token')).resolves.toBe('https://signed');
  });

  it('falls back to avatar_external_url when there is no avatar_path', async () => {
    const repository = buildRepositoryWithUserScopedClient({});
    const profile = buildExpectedProfile({ avatarExternalUrl: 'https://google.example/pic.png' });

    await expect(repository.resolveAvatarUrl(profile, 'token')).resolves.toBe(
      'https://google.example/pic.png',
    );
  });

  it('returns null when neither avatar field is set', async () => {
    const repository = buildRepositoryWithUserScopedClient({});
    const profile = buildExpectedProfile();

    await expect(repository.resolveAvatarUrl(profile, 'token')).resolves.toBeNull();
  });

  it('falls back to avatar_external_url when signing fails', async () => {
    const client = {
      storage: {
        from: () => ({
          createSignedUrl: () =>
            Promise.resolve({ data: null, error: { message: 'signing failed' } }),
        }),
      },
    };
    const repository = buildRepositoryWithUserScopedClient(client);
    const profile = buildExpectedProfile({
      avatarPath: 'user-1/pic.png',
      avatarExternalUrl: 'https://fallback.example/pic.png',
    });

    await expect(repository.resolveAvatarUrl(profile, 'token')).resolves.toBe(
      'https://fallback.example/pic.png',
    );
  });
});

describe('SupabaseProfilesRepository avatar mutations', () => {
  it('setAvatar persists avatar_path', async () => {
    const update = vi.fn(() => ({
      eq: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({
              data: buildProfileRow({ avatar_path: 'user-1/x.png' }),
              error: null,
            }),
        }),
      }),
    }));
    const repository = buildRepositoryWithUserScopedClient({ from: () => ({ update }) });

    const profile = await repository.setAvatar('user-1', 'token', 'user-1/x.png');

    expect(update).toHaveBeenCalledWith({ avatar_path: 'user-1/x.png' });
    expect(profile.avatarPath).toBe('user-1/x.png');
  });

  it('createAvatarUploadUrl returns the signed upload target', async () => {
    const createSignedUploadUrl = vi.fn(() =>
      Promise.resolve({
        data: { path: 'user-1/generated.png', token: 'tok', signedUrl: 'https://upload' },
        error: null,
      }),
    );
    const repository = buildRepositoryWithUserScopedClient({
      storage: { from: () => ({ createSignedUploadUrl }) },
    });

    const target = await repository.createAvatarUploadUrl('user-1', 'token', 'png');

    expect(target).toEqual({
      path: 'user-1/generated.png',
      token: 'tok',
      signedUrl: 'https://upload',
    });
  });
});
