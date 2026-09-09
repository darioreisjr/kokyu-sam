import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { LeisureNoteNotFoundError } from '../../common/errors/app.error';
import {
  LeisureNote,
  LeisureNoteCreateInput,
  LeisureNoteListFilter,
  LeisureNoteUpdateInput,
} from './types/leisure-note.type';
import {
  LEISURE_NOTES_REPOSITORY,
  LeisureNotesRepository,
} from './types/leisure-notes-repository.interface';

@Injectable()
export class LeisureNotesService {
  constructor(
    @Inject(LEISURE_NOTES_REPOSITORY)
    private readonly repository: LeisureNotesRepository,
  ) {}

  findAll(user: AuthenticatedUser, filter: LeisureNoteListFilter): Promise<LeisureNote[]> {
    return this.repository.findAll(user.accessToken, filter);
  }

  async findById(user: AuthenticatedUser, id: string): Promise<LeisureNote> {
    const note = await this.repository.findById(user.accessToken, id);
    if (!note) throw new LeisureNoteNotFoundError();
    return note;
  }

  create(user: AuthenticatedUser, input: LeisureNoteCreateInput): Promise<LeisureNote> {
    return this.repository.create(user.accessToken, user.id, input);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    patch: LeisureNoteUpdateInput,
  ): Promise<LeisureNote> {
    const updated = await this.repository.update(user.accessToken, id, patch);
    if (!updated) throw new LeisureNoteNotFoundError();
    return updated;
  }

  async delete(user: AuthenticatedUser, id: string): Promise<void> {
    await this.repository.delete(user.accessToken, id);
  }

  async togglePin(user: AuthenticatedUser, id: string): Promise<LeisureNote> {
    const current = await this.findById(user, id);
    return this.update(user, id, { pinned: !current.pinned });
  }

  archive(user: AuthenticatedUser, id: string): Promise<LeisureNote> {
    return this.update(user, id, { archived: true });
  }

  async toggleChecklistItem(
    user: AuthenticatedUser,
    noteId: string,
    checklistItemId: string,
  ): Promise<LeisureNote> {
    const current = await this.findById(user, noteId);
    const checklistItems = (current.checklistItems ?? []).map((entry) =>
      entry.id === checklistItemId ? { ...entry, checked: !entry.checked } : entry,
    );
    return this.update(user, noteId, { checklistItems });
  }
}
