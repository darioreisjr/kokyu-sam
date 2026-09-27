import { z } from 'zod';

export const URL_MAX_LENGTH = 2048;

/**
 * A user-supplied link: trimmed, at most 2048 chars, and only http(s).
 * Anything else (`javascript:`, `data:`, `ftp:`...) is refused - these
 * links are rendered as clickable anchors in the app. The frontend
 * validates the same rule before submitting.
 */
export const httpUrlSchema = z
  .string()
  .trim()
  .max(URL_MAX_LENGTH)
  .pipe(z.url({ protocol: /^https?$/, error: 'Must be a valid http(s) URL.' }));
