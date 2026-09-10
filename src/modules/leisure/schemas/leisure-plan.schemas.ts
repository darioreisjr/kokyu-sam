import { z } from 'zod';
import { LEISURE_RECURRENCES } from '../constants/leisure-enums.constant';

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date.');
const timeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Must be an HH:mm time.')
  .nullable()
  .optional();

const planEntryFieldsSchema = z.object({
  leisureItemId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, 'title is required.').max(200),
  date: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  duration: z.number().int().positive().max(100_000).nullable().optional(),
  recurrence: z.enum(LEISURE_RECURRENCES).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  reminder: z.boolean().optional(),
  completed: z.boolean().optional(),
});

export const createPlanEntrySchema = planEntryFieldsSchema.strict();

export const updatePlanEntrySchema = planEntryFieldsSchema.partial().strict();

export const listPlanQuerySchema = z
  .object({
    startDate: dateSchema,
    endDate: dateSchema,
  })
  .strict()
  .refine((data) => data.startDate <= data.endDate, {
    message: 'startDate must be on or before endDate.',
    path: ['endDate'],
  });

/**
 * `date` picks which occurrence of a `'daily'`/`'weekly'` entry is being
 * completed (defaults to the entry's own anchor date when omitted) -
 * irrelevant for `'none'`/`'custom'`, which have only ever had one.
 * `.default({})` because this body is entirely optional - a `'none'`
 * entry's complete call, exactly as before this feature, sends none at
 * all.
 */
export const completePlanEntrySchema = z
  .object({ date: dateSchema.optional() })
  .strict()
  .default({});

export type CreatePlanEntryBody = z.infer<typeof createPlanEntrySchema>;
export type UpdatePlanEntryBody = z.infer<typeof updatePlanEntrySchema>;
export type ListPlanQuery = z.infer<typeof listPlanQuerySchema>;
export type CompletePlanEntryBody = z.infer<typeof completePlanEntrySchema>;
