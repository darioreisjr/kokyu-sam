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
import { LeisureItemsService } from './leisure-items.service';
import { LeisureItemDto, LeisureItemResponse } from './schemas/leisure-item.dto';
import {
  ListLeisureItemsQuery,
  ReclassifyLeisureItemBody,
  UpdateLeisureItemProgressBody,
  createLeisureItemSchema,
  listLeisureItemsQuerySchema,
  reclassifyLeisureItemSchema,
  updateLeisureItemProgressSchema,
  updateLeisureItemSchema,
} from './schemas/leisure-item.schemas';
import {
  LeisureItem,
  LeisureItemCreateInput,
  LeisureItemUpdateInput,
} from './types/leisure-item.type';

@ApiTags('leisure')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired access token.' })
@Controller({ path: 'leisure/items' })
export class LeisureItemsController {
  constructor(private readonly service: LeisureItemsService) {}

  @Get()
  @ApiOperation({
    summary:
      "Lists the caller's leisure library. Every filter is optional - with none, returns every item (the frontend loads this once per page and filters client-side by type/status).",
  })
  @ApiOkResponse({ type: [LeisureItemDto] })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listLeisureItemsQuerySchema)) query: ListLeisureItemsQuery,
  ): Promise<LeisureItemResponse[]> {
    const items = await this.service.findAll(user, query);
    return items.map((item) => this.toResponse(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Returns a single leisure item.' })
  @ApiOkResponse({ type: LeisureItemDto })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisureItemResponse> {
    const item = await this.service.findById(user, params.id);
    return this.toResponse(item);
  }

  @Post()
  @ApiOperation({ summary: 'Adds an item to the leisure library.' })
  @ApiOkResponse({ type: LeisureItemDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createLeisureItemSchema)) body: LeisureItemCreateInput,
  ): Promise<LeisureItemResponse> {
    const item = await this.service.create(user, body);
    return this.toResponse(item);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Updates a leisure item. Sending `type` requires sending its matching data slice too (e.g. `movie: {...}`), which fully replaces the previous slice.',
  })
  @ApiOkResponse({ type: LeisureItemDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
    @Body(new ZodValidationPipe(updateLeisureItemSchema)) body: LeisureItemUpdateInput,
  ): Promise<LeisureItemResponse> {
    const item = await this.service.update(user, params.id, body);
    return this.toResponse(item);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Removes a leisure item permanently.' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<void> {
    await this.service.delete(user, params.id);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: "Toggles the item's favorite flag." })
  @ApiOkResponse({ type: LeisureItemDto })
  async toggleFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisureItemResponse> {
    const item = await this.service.toggleFavorite(user, params.id);
    return this.toResponse(item);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Marks the item as archived.' })
  @ApiOkResponse({ type: LeisureItemDto })
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisureItemResponse> {
    const item = await this.service.archive(user, params.id);
    return this.toResponse(item);
  }

  @Patch(':id/progress')
  @ApiOperation({
    summary:
      "Merges a patch into the item's own type-specific data slice (e.g. `{ currentPage: 155 }` for a book) - never touches base fields.",
  })
  @ApiOkResponse({ type: LeisureItemDto })
  async updateProgress(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
    @Body(new ZodValidationPipe(updateLeisureItemProgressSchema))
    body: UpdateLeisureItemProgressBody,
  ): Promise<LeisureItemResponse> {
    const item = await this.service.updateProgress(user, params.id, body);
    return this.toResponse(item);
  }

  @Post(':id/reclassify')
  @ApiOperation({
    summary:
      'Classifies a Quick Capture ("unsorted") item into a real type, swapping type + data slice atomically.',
  })
  @ApiOkResponse({ type: LeisureItemDto })
  async reclassify(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
    @Body(new ZodValidationPipe(reclassifyLeisureItemSchema)) body: ReclassifyLeisureItemBody,
  ): Promise<LeisureItemResponse> {
    const item = await this.service.reclassify(user, params.id, body);
    return this.toResponse(item);
  }

  private toResponse(item: LeisureItem): LeisureItemResponse {
    const { details, ...base } = item;
    return { ...base, [item.type]: details };
  }
}
