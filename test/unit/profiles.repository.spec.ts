import { describe, expect, it } from 'vitest';
import { ProfileNotFoundError } from '../../src/common/errors/app.error';
import { SupabaseProfilesRepository } from '../../src/modules/profiles/profiles.repository';
import { createFakeProfilesClient } from '../factories/fake-supabase-client';

function buildRepository(result: Parameters<typeof createFakeProfilesClient>[0]) {
  const supabase = {
    getUserScopedClient: () => createFakeProfilesClient(result),
  } as unknown as ConstructorParameters<typeof SupabaseProfilesRepository>[0];

  return new SupabaseProfilesRepository(supabase);
}

describe('SupabaseProfilesRepository.findById', () => {
  it('maps a database row into the domain Profile shape', async () => {
    const repository = buildRepository({
      data: {
        id: 'user-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        username: 'ada',
        birth_date: '1990-01-01',
        avatar_url: null,
        onboarding_complete: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    });

    const profile = await repository.findById('user-1', 'token');

    expect(profile).toEqual({
      id: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      birthDate: '1990-01-01',
      avatarUrl: null,
      onboardingComplete: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('returns null when no row is found', async () => {
    const repository = buildRepository({ data: null, error: null });

    await expect(repository.findById('missing-user', 'token')).resolves.toBeNull();
  });

  it('maps a Supabase error to an AppError instead of throwing the raw error', async () => {
    const repository = buildRepository({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    });

    await expect(repository.findById('user-1', 'token')).rejects.not.toEqual(
      expect.objectContaining({ code: '42501' }),
    );
  });

  it('maps PGRST116 specifically to ProfileNotFoundError', async () => {
    const repository = buildRepository({
      data: null,
      error: { code: 'PGRST116', message: 'no rows' },
    });

    await expect(repository.findById('user-1', 'token')).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });
});
