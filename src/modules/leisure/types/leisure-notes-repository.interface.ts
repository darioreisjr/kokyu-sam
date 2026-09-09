import {
  LeisureNote,
  LeisureNoteCreateInput,
  LeisureNoteListFilter,
  LeisureNoteUpdateInput,
} from './leisure-note.type';

export const LEISURE_NOTES_REPOSITORY = Symbol('LEISURE_NOTES_REPOSITORY');

export interface LeisureNotesRepository {
  findAll: (accessToken: string, filter: LeisureNoteListFilter) => Promise<LeisureNote[]>;
  findById: (accessToken: string, id: string) => Promise<LeisureNote | null>;
  create: (
    accessToken: string,
    userId: string,
    input: LeisureNoteCreateInput,
  ) => Promise<LeisureNote>;
  update: (
    accessToken: string,
    id: string,
    patch: LeisureNoteUpdateInput,
  ) => Promise<LeisureNote | null>;
  delete: (accessToken: string, id: string) => Promise<void>;
}
