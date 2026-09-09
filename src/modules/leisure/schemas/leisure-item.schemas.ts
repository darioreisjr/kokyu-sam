import { z } from 'zod';
import {
  LEISURE_DURATION_TYPES,
  LEISURE_ITEM_STATUSES,
  LEISURE_ITEM_TYPES,
  LEISURE_PRIORITIES,
  LeisureItemType,
} from '../constants/leisure-enums.constant';
import { LeisureItemCreateInput, LeisureItemUpdateInput } from '../types/leisure-item.type';
import { LEISURE_ITEM_DETAILS_SCHEMAS } from './leisure-item-details.schemas';

const titleSchema = z.string().trim().min(1, 'title is required.').max(200);
const descriptionSchema = z.string().trim().max(2000).nullable().optional();
const coverImageSchema = z.string().trim().url().max(2048).nullable().optional();
const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(30).default([]);
const sourceSchema = z.string().trim().max(200).nullable().optional();
const sourceUrlSchema = z.string().trim().url().max(2048).nullable().optional();
const recommendedBySchema = z.string().trim().max(120).nullable().optional();
const durationMinutesSchema = z.number().int().positive().max(100_000).nullable().optional();

const baseFieldsSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  status: z.enum(LEISURE_ITEM_STATUSES).optional(),
  coverImage: coverImageSchema,
  tags: tagsSchema.optional(),
  priority: z.enum(LEISURE_PRIORITIES).nullable().optional(),
  estimatedDuration: durationMinutesSchema,
  durationType: z.enum(LEISURE_DURATION_TYPES).optional(),
  minimumUsefulDuration: durationMinutesSchema,
  favorite: z.boolean().optional(),
  source: sourceSchema,
  sourceUrl: sourceUrlSchema,
  recommendedBy: recommendedBySchema,
});

/**
 * `type` decides which single extra key is required/read (e.g. `movie` for
 * a movie). Built as a passthrough object (not `z.discriminatedUnion`)
 * because the wire format nests the slice under a key *named by* the
 * discriminant rather than a fixed key - superRefine below does the actual
 * per-type validation and `toCreateInput`/`toUpdateInput` extract exactly
 * one recognized slice key, ignoring anything else the client sent.
 */
export const createLeisureItemSchema = baseFieldsSchema
  .extend({ type: z.enum(LEISURE_ITEM_TYPES) })
  .passthrough()
  .superRefine((data, ctx) => {
    validateDetailsSlice(data, ctx);
  })
  .transform((data) => toCreateInput(data));

export const updateLeisureItemSchema = baseFieldsSchema
  .partial()
  .extend({ type: z.enum(LEISURE_ITEM_TYPES).optional() })
  .passthrough()
  .superRefine((data, ctx) => {
    if (data.type) {
      validateDetailsSlice(data as { type: LeisureItemType }, ctx);
    }
  })
  .transform((data) => toUpdateInput(data));

const COVER_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const COVER_MIME_TO_EXTENSION: Record<(typeof COVER_MIME_TYPES)[number], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const coverUploadUrlSchema = z
  .object({
    contentType: z.enum(COVER_MIME_TYPES, {
      errorMap: () => ({ message: 'contentType must be image/png, image/jpeg or image/webp.' }),
    }),
  })
  .strict();

export type CoverUploadUrlBody = z.infer<typeof coverUploadUrlSchema>;

export function extensionForCoverMimeType(contentType: CoverUploadUrlBody['contentType']): string {
  return COVER_MIME_TO_EXTENSION[contentType];
}

export const listLeisureItemsQuerySchema = z
  .object({
    type: z.enum(LEISURE_ITEM_TYPES).optional(),
    status: z.enum(LEISURE_ITEM_STATUSES).optional(),
    favorite: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === 'true')),
    tag: z.string().trim().min(1).max(40).optional(),
    search: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const updateLeisureItemProgressSchema = z
  .object({
    // A patch merged into the item's own type-specific slice (e.g.
    // `{ currentPage: 155 }` for a book) - shape depends on the item's
    // existing `type`, so it's validated against LEISURE_ITEM_DETAILS_SCHEMAS
    // in the service (which knows the item's current type), not here.
    progress: z.record(z.string(), z.unknown()),
  })
  .strict();

export const reclassifyLeisureItemSchema = z
  .object({
    type: z.enum(LEISURE_ITEM_TYPES),
    details: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .strict()
  .superRefine((data, ctx) => {
    const schema = LEISURE_ITEM_DETAILS_SCHEMAS[data.type];
    const result = schema.safeParse(data.details);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ['details', ...issue.path] });
      }
    }
  });

export type ListLeisureItemsQuery = z.infer<typeof listLeisureItemsQuerySchema>;
export type UpdateLeisureItemProgressBody = z.infer<typeof updateLeisureItemProgressSchema>;
export type ReclassifyLeisureItemBody = z.infer<typeof reclassifyLeisureItemSchema>;

function validateDetailsSlice(
  data: Record<string, unknown> & { type: LeisureItemType },
  ctx: z.RefinementCtx,
): void {
  const schema = LEISURE_ITEM_DETAILS_SCHEMAS[data.type];
  const slice = data[data.type] ?? {};
  const result = schema.safeParse(slice);
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.addIssue({ ...issue, path: [data.type, ...issue.path] });
    }
  }
}

function extractDetails(
  data: Record<string, unknown>,
  type: LeisureItemType,
): Record<string, unknown> {
  const slice = data[type];
  return slice && typeof slice === 'object' ? (slice as Record<string, unknown>) : {};
}

function toCreateInput(
  data: Record<string, unknown> & { type: LeisureItemType; title: string },
): LeisureItemCreateInput {
  return {
    type: data.type,
    title: data.title,
    description: data.description as string | null | undefined,
    status: data.status as LeisureItemCreateInput['status'],
    coverImage: data.coverImage as string | null | undefined,
    tags: (data.tags as string[] | undefined) ?? [],
    priority: data.priority as LeisureItemCreateInput['priority'],
    estimatedDuration: data.estimatedDuration as number | null | undefined,
    durationType: data.durationType as LeisureItemCreateInput['durationType'],
    minimumUsefulDuration: data.minimumUsefulDuration as number | null | undefined,
    favorite: data.favorite as boolean | undefined,
    source: data.source as string | null | undefined,
    sourceUrl: data.sourceUrl as string | null | undefined,
    recommendedBy: data.recommendedBy as string | null | undefined,
    details: extractDetails(data, data.type),
  };
}

function toUpdateInput(data: Record<string, unknown>): LeisureItemUpdateInput {
  const patch: LeisureItemUpdateInput = {};
  const assignIfPresent = <K extends keyof LeisureItemUpdateInput>(key: K): void => {
    if (data[key] !== undefined) {
      patch[key] = data[key] as LeisureItemUpdateInput[K];
    }
  };

  assignIfPresent('title');
  assignIfPresent('description');
  assignIfPresent('status');
  assignIfPresent('coverImage');
  assignIfPresent('tags');
  assignIfPresent('priority');
  assignIfPresent('estimatedDuration');
  assignIfPresent('durationType');
  assignIfPresent('minimumUsefulDuration');
  assignIfPresent('favorite');
  assignIfPresent('source');
  assignIfPresent('sourceUrl');
  assignIfPresent('recommendedBy');

  if (data.type) {
    const type = data.type as LeisureItemType;
    patch.type = type;
    patch.details = extractDetails(data, type);
  }

  return patch;
}
