import { Body, Controller, Delete, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AllowIncompleteProfile } from '../../common/auth/decorators/allow-incomplete-profile.decorator';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { ZodValidationPipe } from '../../common/utils/zod-validation.pipe';
import { CurrentUserDto } from './schemas/me-response.dto';
import {
  AvatarUploadUrlBodyDto,
  AvatarUploadUrlResponseDto,
  ProfileMutationBodyDto,
  SetAvatarBodyDto,
} from './schemas/profile-mutation.dto';
import {
  avatarUploadUrlSchema,
  profileMutationSchema,
  setAvatarSchema,
} from './schemas/profile-input.schemas';
import { ProfilesService } from './profiles.service';

@ApiTags('profile')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired access token.' })
@Controller({ path: 'profile' })
export class ProfileMutationsController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('complete')
  @AllowIncompleteProfile()
  @ApiOperation({
    summary:
      'Completes onboarding. Idempotent when the profile is already complete and the payload is valid.',
  })
  @ApiOkResponse({ type: CurrentUserDto })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(profileMutationSchema)) body: ProfileMutationBodyDto,
  ): Promise<CurrentUserDto> {
    return this.profilesService.completeProfile(user, body);
  }

  @Patch()
  @ApiOperation({
    summary:
      'Updates the profile. Refuses to null out required fields (firstName/lastName/username/birthDate) once onboarding is complete.',
  })
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiForbiddenResponse({ description: 'PROFILE_SETUP_REQUIRED - onboarding is not complete yet.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(profileMutationSchema)) body: ProfileMutationBodyDto,
  ): Promise<CurrentUserDto> {
    return this.profilesService.updateProfile(user, body);
  }

  @Post('avatar/upload-url')
  @AllowIncompleteProfile()
  // Stricter than the global default throttle (mirrors authConfig.throttle.sensitive).
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      "Returns a signed Storage upload URL scoped to the caller's own avatars/<uid>/ folder.",
  })
  @ApiOkResponse({ type: AvatarUploadUrlResponseDto })
  async createAvatarUploadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(avatarUploadUrlSchema)) body: AvatarUploadUrlBodyDto,
  ): Promise<AvatarUploadUrlResponseDto> {
    return this.profilesService.createAvatarUploadUrl(user, body);
  }

  @Patch('avatar')
  @AllowIncompleteProfile()
  @ApiOperation({ summary: 'Persists the avatar just uploaded to the given Storage path.' })
  @ApiOkResponse({ type: CurrentUserDto })
  async setAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(setAvatarSchema)) body: SetAvatarBodyDto,
  ): Promise<CurrentUserDto> {
    return this.profilesService.setAvatar(user, body.path);
  }

  @Delete('avatar')
  @AllowIncompleteProfile()
  @ApiOperation({
    summary:
      'Clears the custom avatar. Falls back to the external avatar, or initials, on the frontend.',
  })
  @ApiOkResponse({ type: CurrentUserDto })
  async removeAvatar(@CurrentUser() user: AuthenticatedUser): Promise<CurrentUserDto> {
    return this.profilesService.removeAvatar(user);
  }
}
