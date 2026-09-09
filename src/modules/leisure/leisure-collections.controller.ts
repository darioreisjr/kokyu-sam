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
import { LeisureCollectionsService } from './leisure-collections.service';
import { LeisureCollectionDto } from './schemas/leisure-collection.dto';
import {
  AddCollectionItemBody,
  CreateCollectionBody,
  UpdateCollectionBody,
  addCollectionItemSchema,
  createCollectionSchema,
  removeCollectionItemParamsSchema,
  updateCollectionSchema,
} from './schemas/leisure-collection.schemas';
import { LeisureCollection } from './types/leisure-collection.type';

@ApiTags('leisure')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired access token.' })
@Controller({ path: 'leisure/collections' })
export class LeisureCollectionsController {
  constructor(private readonly service: LeisureCollectionsService) {}

  @Get()
  @ApiOperation({ summary: "Lists the caller's collections, each with its member item ids." })
  @ApiOkResponse({ type: [LeisureCollectionDto] })
  findAll(@CurrentUser() user: AuthenticatedUser): Promise<LeisureCollection[]> {
    return this.service.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Returns a single collection.' })
  @ApiOkResponse({ type: LeisureCollectionDto })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisureCollection> {
    return this.service.findById(user, params.id);
  }

  @Post()
  @ApiOperation({ summary: 'Creates a collection, optionally with initial member items.' })
  @ApiOkResponse({ type: LeisureCollectionDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCollectionSchema)) body: CreateCollectionBody,
  ): Promise<LeisureCollection> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Renames/redescribes a collection (member items are managed via /items).',
  })
  @ApiOkResponse({ type: LeisureCollectionDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
    @Body(new ZodValidationPipe(updateCollectionSchema)) body: UpdateCollectionBody,
  ): Promise<LeisureCollection> {
    return this.service.update(user, params.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletes a collection (member items themselves are never deleted).' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<void> {
    await this.service.delete(user, params.id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Adds an item to the collection (no-op if it already belongs).' })
  @ApiOkResponse({ type: LeisureCollectionDto })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
    @Body(new ZodValidationPipe(addCollectionItemSchema)) body: AddCollectionItemBody,
  ): Promise<LeisureCollection> {
    return this.service.addItem(user, params.id, body.itemId);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Removes an item from the collection.' })
  @ApiOkResponse({ type: LeisureCollectionDto })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(removeCollectionItemParamsSchema))
    params: { id: string; itemId: string },
  ): Promise<LeisureCollection> {
    return this.service.removeItem(user, params.id, params.itemId);
  }
}
