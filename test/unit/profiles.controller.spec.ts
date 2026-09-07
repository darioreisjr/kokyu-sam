import { describe, expect, it, vi } from 'vitest';
import { ProfilesController } from '../../src/modules/profiles/profiles.controller';
import { ProfilesService } from '../../src/modules/profiles/profiles.service';
import { CurrentUserDto } from '../../src/modules/profiles/schemas/me-response.dto';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildExpectedCurrentUser(): CurrentUserDto {
  return {
    id: 'user-1',
    email: 'user@example.test',
    emailVerified: true,
    providers: ['email'],
    profile: {
      firstName: null,
      lastName: null,
      username: null,
      birthDate: null,
      bio: null,
      avatarUrl: null,
      countryCode: null,
      region: null,
      city: null,
    },
    profileCompletion: {
      completed: false,
      completedAt: null,
      version: 1,
      missingFields: ['username'],
    },
    access: { canUseApplication: false, redirectTo: '/perfil/completar' },
  };
}

describe('ProfilesController', () => {
  it('delegates GET /me to ProfilesService.getMe with the current user', async () => {
    const expected = buildExpectedCurrentUser();
    const service = { getMe: vi.fn().mockResolvedValue(expected) } as unknown as ProfilesService;
    const controller = new ProfilesController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.getMe(user);

    expect(service.getMe).toHaveBeenCalledWith(user);
    expect(result).toBe(expected);
  });
});
