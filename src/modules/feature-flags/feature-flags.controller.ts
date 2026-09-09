import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/decorators/public.decorator';
import { NavigationFlagsResponseDto } from './feature-flags.dto';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Lets the frontend gate its navigation (sidebar/drawer lock icons +
 * route access) on sections we're still building, without hardcoding
 * that rollout state into the frontend itself. See
 * feature-flags.constants.ts - flipping a flag there and redeploying
 * the backend is the entire rollout.
 */
@ApiTags('feature-flags')
@Controller({ path: 'feature-flags' })
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get('navigation')
  @Public()
  @ApiOperation({
    summary: 'Which navigation sections are enabled vs. still locked ("em breve").',
  })
  @ApiOkResponse({ type: NavigationFlagsResponseDto })
  getNavigationFlags(): NavigationFlagsResponseDto {
    return { flags: this.featureFlagsService.getNavigationFlags() };
  }
}
