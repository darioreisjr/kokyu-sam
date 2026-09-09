import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
import { LeisureHistoryService } from './leisure-history.service';
import { LeisureLogEntryDto } from './schemas/leisure-log.dto';
import {
  CreateLogEntryBody,
  ListHistoryQuery,
  createLogEntrySchema,
  listHistoryQuerySchema,
} from './schemas/leisure-history.schemas';
import { LeisureLogEntry } from './types/leisure-log-entry.type';

@ApiTags('leisure')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired access token.' })
@Controller({ path: 'leisure/history' })
export class LeisureHistoryController {
  constructor(private readonly service: LeisureHistoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Lists the logbook, most recent first. Capped at 100 rows by default (max 500).',
  })
  @ApiOkResponse({ type: [LeisureLogEntryDto] })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listHistoryQuerySchema)) query: ListHistoryQuery,
  ): Promise<LeisureLogEntry[]> {
    return this.service.findAll(user, query);
  }

  @Post()
  @ApiOperation({
    summary:
      'Logs one occurrence (e.g. "watched this movie"). Never mutates or replaces an existing entry - the same item can be logged any number of times.',
  })
  @ApiOkResponse({ type: LeisureLogEntryDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createLogEntrySchema)) body: CreateLogEntryBody,
  ): Promise<LeisureLogEntry> {
    return this.service.create(user, body);
  }
}
