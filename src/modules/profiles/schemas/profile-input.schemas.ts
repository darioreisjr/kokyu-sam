import { z } from 'zod';
import {
  bioSchema,
  citySchema,
  countryCodeSchema,
  firstNameSchema,
  lastNameSchema,
  profileBirthDateSchema,
  regionSchema,
  usernameSchema,
} from '../../../common/utils/shared.schemas';

/**
 * Field set shared by POST /profile/complete and PATCH /profile ("same
 * field set as complete" - see docs/profile-onboarding.md). `.strict()`
 * rejects any extra key outright - in particular this schema never
 * includes id/email/role/onboardingCompletedAt/onboardingVersion/
 * createdAt/userId, so a client can never mass-assign them even by
 * accident.
 */
export const profileMutationSchema = z
  .object({
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    username: usernameSchema,
    birthDate: profileBirthDateSchema,
    bio: bioSchema,
    countryCode: countryCodeSchema,
    region: regionSchema,
    city: citySchema,
  })
  .strict();

export type ProfileMutationBody = z.infer<typeof profileMutationSchema>;

export const completeProfileSchema = profileMutationSchema;
export const updateProfileSchema = profileMutationSchema;

export const usernameAvailabilityQuerySchema = z
  .object({
    username: z.string().trim().min(1, 'username is required.'),
  })
  .strict();

export type UsernameAvailabilityQuery = z.infer<typeof usernameAvailabilityQuerySchema>;

const AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MIME_TO_EXTENSION: Record<(typeof AVATAR_MIME_TYPES)[number], string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const avatarUploadUrlSchema = z
  .object({
    contentType: z.enum(AVATAR_MIME_TYPES, {
      errorMap: () => ({ message: 'contentType must be image/png, image/jpeg or image/webp.' }),
    }),
  })
  .strict();

export type AvatarUploadUrlBody = z.infer<typeof avatarUploadUrlSchema>;

export function extensionForMimeType(contentType: AvatarUploadUrlBody['contentType']): string {
  return MIME_TO_EXTENSION[contentType];
}

/**
 * The path a client references in PATCH /profile/avatar must be exactly
 * the path our own upload-url endpoint just handed out
 * ("<uid>/<uuid>.<ext>") - never an arbitrary string. Format-validated
 * here; ownership (the `<uid>` segment matching the caller) is re-checked
 * in ProfilesService, never trusted from the client alone.
 */
export const setAvatarSchema = z
  .object({
    path: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .regex(/^[^/]+\/[^/]+$/, 'path must be in the form "<uid>/<file>".'),
  })
  .strict();

export type SetAvatarBody = z.infer<typeof setAvatarSchema>;
