import { z } from 'zod';

const collectionFieldsSchema = z.object({
  name: z.string().trim().min(1, 'name is required.').max(120),
  description: z.string().trim().max(500).nullable().optional(),
  itemIds: z.array(z.guid()).max(500).optional(),
});

export const createCollectionSchema = collectionFieldsSchema.strict();

export const updateCollectionSchema = collectionFieldsSchema
  .omit({ itemIds: true })
  .partial()
  .strict();

export const addCollectionItemSchema = z
  .object({
    itemId: z.guid(),
  })
  .strict();

export const removeCollectionItemParamsSchema = z
  .object({
    id: z.guid(),
    itemId: z.guid(),
  })
  .strict();

export type CreateCollectionBody = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionBody = z.infer<typeof updateCollectionSchema>;
export type AddCollectionItemBody = z.infer<typeof addCollectionItemSchema>;
