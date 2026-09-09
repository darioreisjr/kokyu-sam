import { z } from 'zod';
import { LEISURE_ITEM_TYPES } from '../constants/leisure-enums.constant';

export const createLogEntrySchema = z
  .object({
    leisureItemId: z.string().uuid().nullable().optional(),
    activityType: z.enum(LEISURE_ITEM_TYPES),
    title: z.string().trim().min(1, 'title is required.').max(200),
    startedAt: z.string().trim().datetime({ offset: true }).nullable().optional(),
    completedAt: z.string().trim().datetime({ offset: true }),
    duration: z.number().int().positive().max(100_000).nullable().optional(),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export const listHistoryQuerySchema = z
  .object({
    leisureItemId: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().max(500).optional(),
  })
  .strict();

export type CreateLogEntryBody = z.infer<typeof createLogEntrySchema>;
export type ListHistoryQuery = z.infer<typeof listHistoryQuerySchema>;
