import { z } from 'zod';

export const summaryQuerySchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date.'),
  })
  .strict();

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
