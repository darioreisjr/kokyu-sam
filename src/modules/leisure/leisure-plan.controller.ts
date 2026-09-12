import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { UuidParam } from '../../common/utils/uuid-param.schema';
import { ZodValidationPipe } from '../../common/utils/zod-validation.pipe';
import { LeisurePlanService } from './leisure-plan.service';
import { LeisurePlanEntryDto } from './schemas/leisure-plan.dto';
import {
  CompletePlanEntryBody,
  CreatePlanEntryBody,
  ListPlanQuery,
  UpdatePlanEntryBody,
  completePlanEntrySchema,
  createPlanEntrySchema,
  listPlanQuerySchema,
  updatePlanEntrySchema,
} from './schemas/leisure-plan.schemas';
import { LeisurePlanEntry } from './types/leisure-plan-entry.type';

@ApiTags('leisure')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired access token.' })
@Controller({ path: 'leisure/plan' })
export class LeisurePlanController {
  constructor(private readonly service: LeisurePlanService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lists plan entries in a date range (inclusive). Pass the same date as startDate/endDate for a single day (e.g. "Hoje").',
  })
  @ApiOkResponse({ type: [LeisurePlanEntryDto] })
  findByDateRange(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listPlanQuerySchema)) query: ListPlanQuery,
  ): Promise<LeisurePlanEntry[]> {
    return this.service.findByDateRange(user, query.startDate, query.endDate);
  }

  @Post()
  @ApiOperation({ summary: 'Creates a plan entry.' })
  @ApiOkResponse({ type: LeisurePlanEntryDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPlanEntrySchema)) body: CreatePlanEntryBody,
  ): Promise<LeisurePlanEntry> {
    return this.service.create(user, body);
  }

  // Literal path, declared before `GET :id` — Nest/Express match routes in
  // registration order, and `:id` would otherwise swallow `/archived` as an
  // id value (the same ordering concern this controller would have for any
  // literal segment alongside a param route at the same depth).
  @Get('archived')
  @ApiOperation({
    summary:
      'Lists every archived plan entry for the caller - flat rows by their own date, no date-range filtering and no recurrence expansion.',
  })
  @ApiOkResponse({ type: [LeisurePlanEntryDto] })
  findArchived(@CurrentUser() user: AuthenticatedUser): Promise<LeisurePlanEntry[]> {
    return this.service.findArchived(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Gets a single plan entry by id (e.g. to prefill the edit page).' })
  @ApiOkResponse({ type: LeisurePlanEntryDto })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisurePlanEntry> {
    return this.service.findById(user, params.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Updates a plan entry (e.g. reschedule).' })
  @ApiOkResponse({ type: LeisurePlanEntryDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
    @Body(new ZodValidationPipe(updatePlanEntrySchema)) body: UpdatePlanEntryBody,
  ): Promise<LeisurePlanEntry> {
    return this.service.update(user, params.id, body);
  }

  @Post(':id/archive')
  @ApiOperation({
    summary:
      'Archives a plan entry - the only way a plan entry is ever removed. Never a hard delete; reversible via POST :id/unarchive. A no-op success if the entry is already archived.',
  })
  @ApiOkResponse({ type: LeisurePlanEntryDto })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisurePlanEntry> {
    return this.service.archive(user, params.id);
  }

  @Post(':id/unarchive')
  @ApiOperation({
    summary: 'Unarchives a plan entry. A no-op success if the entry is not currently archived.',
  })
  @ApiOkResponse({ type: LeisurePlanEntryDto })
  unarchive(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisurePlanEntry> {
    return this.service.unarchive(user, params.id);
  }

  @Post(':id/complete')
  @ApiOperation({
    summary:
      "Marks a plan entry as completed. For a daily/weekly entry, `date` picks which occurrence (defaults to the entry's own anchor date) - every other occurrence is unaffected.",
  })
  @ApiOkResponse({ type: LeisurePlanEntryDto })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
    @Body(new ZodValidationPipe(completePlanEntrySchema)) body: CompletePlanEntryBody,
  ): Promise<LeisurePlanEntry> {
    return this.service.complete(user, params.id, body.date);
  }
}
