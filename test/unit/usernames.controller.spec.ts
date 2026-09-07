import { describe, expect, it, vi } from 'vitest';
import { UsernamesController } from '../../src/modules/profiles/usernames.controller';
import { ProfilesService } from '../../src/modules/profiles/profiles.service';

describe('UsernamesController', () => {
  it('GET /usernames/availability delegates to ProfilesService.checkUsernameAvailability', async () => {
    const expected = { username: 'ada', available: true };
    const service = {
      checkUsernameAvailability: vi.fn().mockResolvedValue(expected),
    } as unknown as ProfilesService;
    const controller = new UsernamesController(service);

    const result = await controller.checkAvailability({ username: 'ada' });

    expect(service.checkUsernameAvailability).toHaveBeenCalledWith('ada');
    expect(result).toBe(expected);
  });
});
