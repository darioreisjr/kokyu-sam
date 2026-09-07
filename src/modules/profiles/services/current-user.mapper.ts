import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../../common/auth/types/authenticated-user.type';
import { CurrentUserDto } from '../schemas/me-response.dto';
import { Profile } from '../types/profile.type';
import { ProfileCompletionService } from './profile-completion.service';

const ONBOARDING_REDIRECT_PATH = '/perfil/completar';

/**
 * Combines AuthenticatedUser + Profile + ProfileCompletionService output
 * into the CurrentUser contract every profile endpoint returns. Pure/sync
 * on purpose (no DB/Storage I/O) so it's trivial to unit test - callers
 * resolve `avatarUrl` beforehand (it needs a Storage round trip when a
 * custom avatar is set).
 *
 * Controllers must never hand-assemble this response themselves.
 */
@Injectable()
export class CurrentUserMapper {
  constructor(private readonly completionService: ProfileCompletionService) {}

  map(user: AuthenticatedUser, profile: Profile, avatarUrl: string | null): CurrentUserDto {
    const completion = this.completionService.compute(profile);

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      providers: user.providers,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        birthDate: profile.birthDate,
        bio: profile.bio,
        avatarUrl,
        countryCode: profile.countryCode,
        region: profile.region,
        city: profile.city,
      },
      profileCompletion: completion,
      access: {
        canUseApplication: completion.completed,
        redirectTo: completion.completed ? null : ONBOARDING_REDIRECT_PATH,
      },
    };
  }
}
