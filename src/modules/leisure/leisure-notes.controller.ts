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
import { LeisureNotesService } from './leisure-notes.service';
import { LeisureNoteDto } from './schemas/leisure-note.dto';
import {
  CreateNoteBody,
  ListNotesQuery,
  UpdateNoteBody,
  createNoteSchema,
  listNotesQuerySchema,
  toggleChecklistItemParamsSchema,
  updateNoteSchema,
} from './schemas/leisure-note.schemas';
import { LeisureNote } from './types/leisure-note.type';

@ApiTags('leisure')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired access token.' })
@Controller({ path: 'leisure/notes' })
export class LeisureNotesController {
  constructor(private readonly service: LeisureNotesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lists notes, optionally filtered by pinned/archived/tag/related item.',
  })
  @ApiOkResponse({ type: [LeisureNoteDto] })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listNotesQuerySchema)) query: ListNotesQuery,
  ): Promise<LeisureNote[]> {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Returns a single note.' })
  @ApiOkResponse({ type: LeisureNoteDto })
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisureNote> {
    return this.service.findById(user, params.id);
  }

  @Post()
  @ApiOperation({ summary: 'Creates a note.' })
  @ApiOkResponse({ type: LeisureNoteDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createNoteSchema)) body: CreateNoteBody,
  ): Promise<LeisureNote> {
    return this.service.create(user, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Updates a note.' })
  @ApiOkResponse({ type: LeisureNoteDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
    @Body(new ZodValidationPipe(updateNoteSchema)) body: UpdateNoteBody,
  ): Promise<LeisureNote> {
    return this.service.update(user, params.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletes a note.' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<void> {
    await this.service.delete(user, params.id);
  }

  @Post(':id/pin')
  @ApiOperation({ summary: "Toggles the note's pinned flag." })
  @ApiOkResponse({ type: LeisureNoteDto })
  togglePin(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisureNote> {
    return this.service.togglePin(user, params.id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archives a note.' })
  @ApiOkResponse({ type: LeisureNoteDto })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(UuidParam)) params: { id: string },
  ): Promise<LeisureNote> {
    return this.service.archive(user, params.id);
  }

  @Patch(':noteId/checklist/:checklistItemId')
  @ApiOperation({ summary: 'Toggles one checklist item on a checklist-type note.' })
  @ApiOkResponse({ type: LeisureNoteDto })
  toggleChecklistItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(toggleChecklistItemParamsSchema))
    params: { noteId: string; checklistItemId: string },
  ): Promise<LeisureNote> {
    return this.service.toggleChecklistItem(user, params.noteId, params.checklistItemId);
  }
}
