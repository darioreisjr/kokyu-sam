import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { ZodValidationPipe } from '../../common/utils/zod-validation.pipe';
import { LeisureSummaryService } from './leisure-summary.service';
import { LeisureSummaryDto } from './schemas/leisure-summary.dto';
import { SummaryQuery, summaryQuerySchema } from './schemas/leisure-summary.schemas';
import { LeisureSummary } from './types/leisure-summary.type';

@ApiTags('leisure')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired access token.' })
@Controller({ path: 'leisure/summary' })
export class LeisureSummaryController {
  constructor(private readonly service: LeisureSummaryService) {}

  @Get()
  @ApiOperation({
    summary:
      "Lightweight projection for the Home screen: today's next planned entry, the item in progress (if any), and the backlog count - purpose-built so Home never fetches the full item/plan list just to derive these three values.",
  })
  @ApiOkResponse({ type: LeisureSummaryDto })
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(summaryQuerySchema)) query: SummaryQuery,
  ): Promise<LeisureSummary> {
    return this.service.getSummary(user, query.date);
  }
}
