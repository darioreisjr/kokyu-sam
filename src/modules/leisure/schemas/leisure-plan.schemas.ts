import { z } from 'zod';
import { LEISURE_RECURRENCES } from '../constants/leisure-enums.constant';

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date.');

const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

/** Nullable/optional for `updatePlanEntrySchema` - PATCH semantics, a caller may omit or clear it. */
function nullableTimeSchema() {
  return z.string().trim().regex(timeRegex, 'Must be an HH:mm time.').nullable().optional();
}

/** Required (non-null) for `createPlanEntrySchema` - see `fieldName` for the "is required." message. */
function requiredTimeSchema(fieldName: string) {
  return z
    .string({ required_error: `${fieldName} is required.` })
    .trim()
    .regex(timeRegex, 'Must be an HH:mm time.');
}

/** Nullable/optional for `updatePlanEntrySchema` - PATCH semantics, a caller may omit or clear it. */
function nullableDurationSchema() {
  return z.number().int().positive().max(100_000).nullable().optional();
}

/** Required for `createPlanEntrySchema`. */
function requiredDurationSchema() {
  return z.number({ required_error: 'duration is required.' }).int().positive().max(100_000);
}

const planEntrySharedFieldsSchema = {
  leisureItemId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, 'title is required.').max(200),
  date: dateSchema,
  recurrence: z.enum(LEISURE_RECURRENCES).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  reminder: z.boolean().optional(),
  completed: z.boolean().optional(),
};

// `startTime`/`endTime`/`duration` are the only fields that differ between
// create and update: creation requires all three (only `notes` stays
// optional there), while a PATCH keeps them nullable/optional so a caller
// can update a single field (e.g. `completed`) without resending the rest -
// and the `start_time`/`end_time`/`duration` DB columns stay nullable
// regardless, this is an application-level rule only.
const createPlanEntryFieldsSchema = z.object({
  ...planEntrySharedFieldsSchema,
  startTime: requiredTimeSchema('startTime'),
  endTime: requiredTimeSchema('endTime'),
  duration: requiredDurationSchema(),
});

const updatePlanEntryFieldsSchema = z.object({
  ...planEntrySharedFieldsSchema,
  startTime: nullableTimeSchema(),
  endTime: nullableTimeSchema(),
  duration: nullableDurationSchema(),
});

export const createPlanEntrySchema = createPlanEntryFieldsSchema.strict();

export const updatePlanEntrySchema = updatePlanEntryFieldsSchema.partial().strict();

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
