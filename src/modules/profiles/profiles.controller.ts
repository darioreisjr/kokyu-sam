import { Controller, Get } from '@nestjs/common';
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
import { CurrentUserDto } from './schemas/me-response.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller({ path: 'me' })
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  @AllowIncompleteProfile()
  @ApiOperation({
    summary:
      'Returns the authenticated user and their Kokyu profile. Idempotently bootstraps profile fields from Auth identity metadata on first read.',
  })
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired access token.' })
  @ApiForbiddenResponse({
    description: 'Never returned here - GET /me is always reachable with an incomplete profile.',
  })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<CurrentUserDto> {
    return this.profilesService.getMe(user);
  }
}
