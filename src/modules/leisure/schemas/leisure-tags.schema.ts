import { z } from 'zod';

export const TAG_MAX_LENGTH = 40;
export const TAGS_MAX_COUNT = 30;

/**
 * Canonical tag form, shared by every leisure resource that stores tags:
 * trimmed, inner whitespace collapsed, lower-cased (pt-BR). Accents and
 * spaces are kept — "Fim de Semana" becomes "fim de semana", not a slug.
 * The frontend normalizes the same way; this is the server-side guarantee.
 */
export function normalizeTag(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

export const tagSchema = z.string().trim().min(1).max(TAG_MAX_LENGTH).transform(normalizeTag);

/** Normalized and de-duplicated — "Praia" and "praia" collapse into one "praia". */
export const tagsSchema = z
  .array(tagSchema)
  .max(TAGS_MAX_COUNT)
  .transform((tags) => [...new Set(tags)]);
