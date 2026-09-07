import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AllowIncompleteProfile } from '../../common/auth/decorators/allow-incomplete-profile.decorator';
import { Public } from '../../common/auth/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/utils/zod-validation.pipe';
import { UsernameAvailabilityResponseDto } from './schemas/profile-mutation.dto';
import { usernameAvailabilityQuerySchema } from './schemas/profile-input.schemas';
import { ProfilesService } from './profiles.service';

@ApiTags('usernames')
@Controller({ path: 'usernames' })
export class UsernamesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('availability')
  @Public()
  @AllowIncompleteProfile()
  // Stricter than the global default throttle (mirrors authConfig.throttle.sensitive)
  // - this endpoint is unauthenticated and cheap to hammer for enumeration/scraping.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Checks whether a username is available. Never reveals who owns a taken username.',
  })
  @ApiQuery({ name: 'username', required: true })
  @ApiOkResponse({ type: UsernameAvailabilityResponseDto })
  async checkAvailability(
    @Query(new ZodValidationPipe(usernameAvailabilityQuerySchema)) query: { username: string },
  ): Promise<UsernameAvailabilityResponseDto> {
    return this.profilesService.checkUsernameAvailability(query.username);
  }
}
