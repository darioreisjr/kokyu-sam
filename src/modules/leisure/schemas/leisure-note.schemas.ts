import { z } from 'zod';
import { LEISURE_NOTE_TYPES } from '../constants/leisure-enums.constant';
import { tagSchema, tagsSchema } from './leisure-tags.schema';

const checklistItemSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    text: z.string().trim().min(1).max(300),
    checked: z.boolean(),
  })
  .strict();

const relatedEntitySchema = z
  .object({
    entityType: z.literal('leisureItem'),
    entityId: z.guid(),
  })
  .strict();

const noteFieldsSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  content: z.string().trim().max(5000),
  type: z.enum(LEISURE_NOTE_TYPES),
  checklistItems: z.array(checklistItemSchema).max(100).nullable().optional(),
  linkUrl: z.string().trim().url().max(2048).nullable().optional(),
  tags: tagsSchema.optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  reminderDate: z.string().trim().datetime({ offset: true }).nullable().optional(),
  relatedEntity: relatedEntitySchema.nullable().optional(),
});

export const createNoteSchema = noteFieldsSchema.strict();
export const updateNoteSchema = noteFieldsSchema.partial().strict();

export const listNotesQuerySchema = z
  .object({
    pinned: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    archived: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    tag: tagSchema.optional(),
    relatedItemId: z.guid().optional(),
  })
  .strict();

export const toggleChecklistItemParamsSchema = z
  .object({
    noteId: z.guid(),
    checklistItemId: z.string().trim().min(1).max(80),
  })
  .strict();

export type CreateNoteBody = z.infer<typeof createNoteSchema>;
export type UpdateNoteBody = z.infer<typeof updateNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
