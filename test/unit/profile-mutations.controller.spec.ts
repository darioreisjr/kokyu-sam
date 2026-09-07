import { describe, expect, it, vi } from 'vitest';
import { ProfileMutationsController } from '../../src/modules/profiles/profile-mutations.controller';
import { ProfilesService } from '../../src/modules/profiles/profiles.service';
import { CurrentUserDto } from '../../src/modules/profiles/schemas/me-response.dto';
import { buildAuthenticatedUser } from '../factories/authenticated-user.factory';

function buildService(overrides: Partial<Record<keyof ProfilesService, unknown>> = {}) {
  return {
    completeProfile: vi.fn(),
    updateProfile: vi.fn(),
    createAvatarUploadUrl: vi.fn(),
    setAvatar: vi.fn(),
    removeAvatar: vi.fn(),
    ...overrides,
  } as unknown as ProfilesService;
}

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

describe('ProfileMutationsController', () => {
  it('POST /profile/complete delegates to ProfilesService.completeProfile', async () => {
    const expected = { id: 'user-1' } as unknown as CurrentUserDto;
    const service = buildService({ completeProfile: vi.fn().mockResolvedValue(expected) });
    const controller = new ProfileMutationsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.complete(user, body);

    expect(service.completeProfile).toHaveBeenCalledWith(user, body);
    expect(result).toBe(expected);
  });

  it('PATCH /profile delegates to ProfilesService.updateProfile', async () => {
    const expected = { id: 'user-1' } as unknown as CurrentUserDto;
    const service = buildService({ updateProfile: vi.fn().mockResolvedValue(expected) });
    const controller = new ProfileMutationsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.update(user, body);

    expect(service.updateProfile).toHaveBeenCalledWith(user, body);
    expect(result).toBe(expected);
  });

  it('POST /profile/avatar/upload-url delegates to ProfilesService.createAvatarUploadUrl', async () => {
    const expected = { path: 'x', token: 't', signedUrl: 'https://upload' };
    const service = buildService({ createAvatarUploadUrl: vi.fn().mockResolvedValue(expected) });
    const controller = new ProfileMutationsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.createAvatarUploadUrl(user, { contentType: 'image/png' });

    expect(service.createAvatarUploadUrl).toHaveBeenCalledWith(user, { contentType: 'image/png' });
    expect(result).toBe(expected);
  });

  it('PATCH /profile/avatar delegates to ProfilesService.setAvatar', async () => {
    const expected = { id: 'user-1' } as unknown as CurrentUserDto;
    const service = buildService({ setAvatar: vi.fn().mockResolvedValue(expected) });
    const controller = new ProfileMutationsController(service);
    const user = buildAuthenticatedUser({ id: 'user-1' });

    const result = await controller.setAvatar(user, { path: 'user-1/x.png' });

    expect(service.setAvatar).toHaveBeenCalledWith(user, 'user-1/x.png');
    expect(result).toBe(expected);
  });

  it('DELETE /profile/avatar delegates to ProfilesService.removeAvatar', async () => {
    const expected = { id: 'user-1' } as unknown as CurrentUserDto;
    const service = buildService({ removeAvatar: vi.fn().mockResolvedValue(expected) });
    const controller = new ProfileMutationsController(service);
    const user = buildAuthenticatedUser();

    const result = await controller.removeAvatar(user);

    expect(service.removeAvatar).toHaveBeenCalledWith(user);
    expect(result).toBe(expected);
  });
});
