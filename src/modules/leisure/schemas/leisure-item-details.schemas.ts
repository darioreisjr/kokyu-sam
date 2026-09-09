import { z, ZodTypeAny } from 'zod';
import { LEISURE_ITEM_TYPES, LeisureItemType } from '../constants/leisure-enums.constant';

/**
 * One schema per item type for its `details` slice (the object keyed by
 * `type` in the wire shape, e.g. `{ type: 'movie', movie: {...} }`).
 * Mirrors the kokyu frontend's `types/leisureItem.types.ts` field-for-field.
 * Every field is optional except where the frontend type itself has no
 * `?` (only `place.category`) - everything else defaults to `{}` being
 * valid, matching `Record<string, never>` slices like `video`/`website`.
 */
const positiveInt = z.number().int().positive();
const nonNegativeInt = z.number().int().nonnegative();
const optionalText = z.string().trim().min(1).max(200).optional();
const optionalGenres = z.array(z.string().trim().min(1).max(60)).max(20).optional();

const movieDetailsSchema = z
  .object({
    runtime: positiveInt.optional(),
    releaseYear: z.number().int().min(1870).max(2200).optional(),
    genres: optionalGenres,
  })
  .strict();

const tvShowDetailsSchema = z
  .object({
    currentSeason: positiveInt.optional(),
    currentEpisode: positiveInt.optional(),
    totalSeasons: positiveInt.optional(),
    totalEpisodesInSeason: positiveInt.optional(),
    genres: optionalGenres,
  })
  .strict();

const bookDetailsSchema = z
  .object({
    author: optionalText,
    pages: positiveInt.optional(),
    currentPage: nonNegativeInt.optional(),
  })
  .strict();

const audiobookDetailsSchema = z
  .object({
    author: optionalText,
    narrator: optionalText,
    totalMinutes: positiveInt.optional(),
    currentMinute: nonNegativeInt.optional(),
  })
  .strict();

const gameDetailsSchema = z
  .object({
    platform: optionalText,
    hoursPlayed: nonNegativeInt.optional(),
  })
  .strict();

const podcastDetailsSchema = z
  .object({
    totalEpisodes: positiveInt.optional(),
    currentEpisode: nonNegativeInt.optional(),
  })
  .strict();

const musicDetailsSchema = z
  .object({
    artist: optionalText,
    album: optionalText,
    kind: z.enum(['album', 'playlist', 'track', 'other']).optional(),
  })
  .strict();

const emptyDetailsSchema = z.object({}).strict();

const articleDetailsSchema = z
  .object({
    estimatedReadMinutes: positiveInt.optional(),
  })
  .strict();

const placeDetailsSchema = z
  .object({
    category: z.string().trim().min(1).max(80),
    address: optionalText,
    city: optionalText,
  })
  .strict();

const eventDetailsSchema = z
  .object({
    date: z.string().trim().min(1).max(40).optional(),
    time: z.string().trim().min(1).max(20).optional(),
    location: optionalText,
    ticket: z
      .object({
        purchased: z.boolean().optional(),
        price: z.number().nonnegative().optional(),
        ticketUrl: z.string().trim().url().max(2048).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const hobbyDetailsSchema = z
  .object({
    startedAt: z.string().trim().min(1).max(40).optional(),
    estimatedSessionDuration: positiveInt.optional(),
  })
  .strict();

export const LEISURE_ITEM_DETAILS_SCHEMAS: Record<LeisureItemType, ZodTypeAny> = {
  movie: movieDetailsSchema,
  tvShow: tvShowDetailsSchema,
  book: bookDetailsSchema,
  audiobook: audiobookDetailsSchema,
  game: gameDetailsSchema,
  podcast: podcastDetailsSchema,
  music: musicDetailsSchema,
  video: emptyDetailsSchema,
  article: articleDetailsSchema,
  website: emptyDetailsSchema,
  place: placeDetailsSchema,
  event: eventDetailsSchema,
  activity: emptyDetailsSchema,
  hobby: hobbyDetailsSchema,
  custom: emptyDetailsSchema,
  unsorted: emptyDetailsSchema,
};

/** Defensive - keeps this map and LEISURE_ITEM_TYPES from silently drifting apart. */
LEISURE_ITEM_TYPES.forEach((type) => {
  if (!LEISURE_ITEM_DETAILS_SCHEMAS[type]) {
    throw new Error(`Missing details schema for leisure item type "${type}".`);
  }
});
