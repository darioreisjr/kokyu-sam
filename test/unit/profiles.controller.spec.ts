import { describe, expect, it, vi } from 'vitest';
import { ProfilesController } from '../../src/modules/profiles/profiles.controller';
import { ProfilesService } from '../../src/modules/profiles/profiles.service';
import { MeResponseDto } from '../../src/modules/profiles/schemas/me-response.dto';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

describe('ProfilesController', () => {
  it('delegates GET /me to ProfilesService.getMe with the current user', async () => {
    const expected: MeResponseDto = {
      user: { id: 'user-1', email: 'user@example.test', emailVerified: true, provider: 'email' },
      profile: {
        firstName: null,
        lastName: null,
        username: null,
        birthDate: null,
        avatarUrl: null,
        onboardingComplete: false,
      },
    };
    const service = { getMe: vi.fn().mockResolvedValue(expected) } as unknown as ProfilesService;
    const controller = new ProfilesController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.getMe(user);

    expect(service.getMe).toHaveBeenCalledWith(user);
    expect(result).toBe(expected);
  });
});
