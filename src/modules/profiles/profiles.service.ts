import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { ProfileNotFoundError } from '../../common/errors/app.error';
import { MeResponseDto } from './schemas/me-response.dto';
import { PROFILES_REPOSITORY, ProfilesRepository } from './types/profiles-repository.interface';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(PROFILES_REPOSITORY)
    private readonly profilesRepository: ProfilesRepository,
  ) {}

  async getMe(user: AuthenticatedUser): Promise<MeResponseDto> {
    const profile = await this.profilesRepository.findById(user.id, user.accessToken);

    if (!profile) {
      // The handle_new_user() trigger creates a profile for every new auth
      // user, so a missing profile here means something is actually wrong
      // rather than "not onboarded yet" (that's onboardingComplete=false).
      throw new ProfileNotFoundError();
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        // Supabase only issues a session once the account's email has been
        // confirmed (email confirmation is required - see
        // docs/security.md), so a valid access token implies a verified
        // email without an extra getUser() round trip on every request.
        emailVerified: true,
        provider: user.provider,
      },
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        birthDate: profile.birthDate,
        avatarUrl: profile.avatarUrl,
        onboardingComplete: profile.onboardingComplete,
      },
    };
  }
}
