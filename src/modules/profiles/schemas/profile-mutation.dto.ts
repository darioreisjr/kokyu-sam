import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Swagger/request-shape mirror of profileMutationSchema (see
 * profile-input.schemas.ts) - actual validation is done by Zod via
 * ZodValidationPipe, this class exists only so Swagger can document the
 * request body shape. Deliberately excludes id/email/role/
 * onboardingCompletedAt/onboardingVersion/createdAt/userId - the Zod
 * schema's `.strict()` rejects them even if a client sends them anyway.
 */
export class ProfileMutationBodyDto {
  @ApiProperty({ maxLength: 80 })
  firstName!: string;

  @ApiProperty({ maxLength: 120 })
  lastName!: string;

  @ApiProperty({ description: 'Lowercase, starts with a letter, 3-30 chars: a-z0-9_.' })
  username!: string;

  @ApiProperty({ description: 'ISO date (YYYY-MM-DD). Must represent an age of 18+.' })
  birthDate!: string;

  @ApiPropertyOptional({ maxLength: 160, nullable: true })
  bio?: string | null;

  @ApiPropertyOptional({ description: '2-letter ISO country code, e.g. "BR".', nullable: true })
  countryCode?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  region?: string | null;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  city?: string | null;
}

export class UsernameAvailabilityResponseDto {
  @ApiProperty()
  username!: string;

  @ApiProperty()
  available!: boolean;
}

export class AvatarUploadUrlBodyDto {
  @ApiProperty({ enum: ['image/png', 'image/jpeg', 'image/webp'] })
  contentType!: 'image/png' | 'image/jpeg' | 'image/webp';
}

export class AvatarUploadUrlResponseDto {
  @ApiProperty({ description: 'Storage object path the client uploads to.' })
  path!: string;

  @ApiProperty({ description: 'One-time token to pair with signedUrl.' })
  token!: string;

  @ApiProperty({ description: 'Signed URL - PUT the file here directly.' })
  signedUrl!: string;
}

export class SetAvatarBodyDto {
  @ApiProperty({ description: 'Storage object path returned by the upload-url endpoint.' })
  path!: string;
}
