import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { AvatarInvalidError, ProfileNotFoundError } from '../../common/errors/app.error';
import {
  AvatarUploadUrlResponseDto,
  UsernameAvailabilityResponseDto,
} from './schemas/profile-mutation.dto';
import { CurrentUserDto } from './schemas/me-response.dto';
import {
  AvatarUploadUrlBody,
  ProfileMutationBody,
  extensionForMimeType,
} from './schemas/profile-input.schemas';
import { CurrentUserMapper } from './services/current-user.mapper';
import { ProfileBootstrapService } from './services/profile-bootstrap.service';
import { ProfileCompletionService } from './services/profile-completion.service';
import { Profile, ProfileMutationInput } from './types/profile.type';
import { PROFILES_REPOSITORY, ProfilesRepository } from './types/profiles-repository.interface';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(PROFILES_REPOSITORY)
    private readonly profilesRepository: ProfilesRepository,
    private readonly bootstrapService: ProfileBootstrapService,
    private readonly completionService: ProfileCompletionService,
    private readonly currentUserMapper: CurrentUserMapper,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ProfilesService.name);
  }

  async getMe(user: AuthenticatedUser): Promise<CurrentUserDto> {
    const profile = await this.requireProfile(user);
    const bootstrapped = await this.bootstrapService.maybeBootstrap(user, profile);
    return this.toCurrentUser(user, bootstrapped);
  }

  /**
   * Lightweight completion check used by ProfileCompleteGuard - a single
   * cheap query, no full profile fetch and no bootstrap pass (bootstrap is
   * only relevant to what GET /me returns, not to the access decision).
   */
  async isOnboardingComplete(user: AuthenticatedUser): Promise<boolean> {
    const status = await this.profilesRepository.getOnboardingStatus(user.id, user.accessToken);
    if (!status) {
      throw new ProfileNotFoundError();
    }
    return this.completionService.isComplete(status);
  }

  async checkUsernameAvailability(username: string): Promise<UsernameAvailabilityResponseDto> {
    const available = await this.profilesRepository.isUsernameAvailable(username);
    // Echo back the normalized form, not the raw query param - never
    // implies anything about ownership either way.
    return { username, available };
  }

  async completeProfile(
    user: AuthenticatedUser,
    body: ProfileMutationBody,
  ): Promise<CurrentUserDto> {
    const input = this.toMutationInput(body);
    const profile = await this.profilesRepository.complete(user.accessToken, input);

    this.logger.info(
      { event: 'profile.onboarding.completed', userId: user.id },
      'profile.onboarding.completed',
    );

    return this.toCurrentUser(user, profile);
  }

  async updateProfile(user: AuthenticatedUser, body: ProfileMutationBody): Promise<CurrentUserDto> {
    const input = this.toMutationInput(body);
    const profile = await this.profilesRepository.update(user.accessToken, input);

    this.logger.info(
      { event: 'profile.updated', userId: user.id, fields: Object.keys(body) },
      'profile.updated',
    );

    return this.toCurrentUser(user, profile);
  }

  async createAvatarUploadUrl(
    user: AuthenticatedUser,
    body: AvatarUploadUrlBody,
  ): Promise<AvatarUploadUrlResponseDto> {
    const extension = extensionForMimeType(body.contentType);
    return this.profilesRepository.createAvatarUploadUrl(user.id, user.accessToken, extension);
  }

  async setAvatar(user: AuthenticatedUser, path: string): Promise<CurrentUserDto> {
    // Defense in depth: even though Storage RLS already scopes uploads to
    // "<uid>/*", never persist a path that doesn't start with the
    // caller's own id - a client could otherwise reference a path it
    // never actually owns/uploaded to.
    if (!path.startsWith(`${user.id}/`)) {
      throw new AvatarInvalidError('Avatar path does not belong to the current user.');
    }

    const profile = await this.profilesRepository.setAvatar(user.id, user.accessToken, path);

    this.logger.info(
      { event: 'profile.avatar.updated', userId: user.id },
      'profile.avatar.updated',
    );

    return this.toCurrentUser(user, profile);
  }

  async removeAvatar(user: AuthenticatedUser): Promise<CurrentUserDto> {
    const profile = await this.profilesRepository.removeAvatar(user.id, user.accessToken);

    this.logger.info(
      { event: 'profile.avatar.updated', userId: user.id },
      'profile.avatar.updated',
    );

    return this.toCurrentUser(user, profile);
  }

  private async requireProfile(user: AuthenticatedUser): Promise<Profile> {
    const profile = await this.profilesRepository.findByUserId(user.id, user.accessToken);

    if (!profile) {
      // The handle_new_user() trigger creates a profile for every new auth
      // user, so a missing profile here means something is actually wrong
      // rather than "not onboarded yet" (that's profileCompletion.completed=false).
      throw new ProfileNotFoundError();
    }

    return profile;
  }

  private async toCurrentUser(user: AuthenticatedUser, profile: Profile): Promise<CurrentUserDto> {
    const avatarUrl = await this.profilesRepository.resolveAvatarUrl(profile, user.accessToken);
    return this.currentUserMapper.map(user, profile, avatarUrl);
  }

  private toMutationInput(body: ProfileMutationBody): ProfileMutationInput {
    return {
      firstName: body.firstName,
      lastName: body.lastName,
      username: body.username,
      birthDate: body.birthDate,
      bio: body.bio ?? null,
      countryCode: body.countryCode ?? null,
      region: body.region ?? null,
      city: body.city ?? null,
    };
  }
}
