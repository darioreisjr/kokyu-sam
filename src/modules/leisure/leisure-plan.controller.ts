import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
  CreatePlanEntryBody,
  ListPlanQuery,
  UpdatePlanEntryBody,
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletes a plan entry.' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<void> {
    await this.service.delete(user, params.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Marks a plan entry as completed.' })
  @ApiOkResponse({ type: LeisurePlanEntryDto })
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisurePlanEntry> {
    return this.service.complete(user, params.id);
  }
}
