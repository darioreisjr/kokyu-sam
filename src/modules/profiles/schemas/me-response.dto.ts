import { ApiProperty } from '@nestjs/swagger';

/**
 * Response shape for GET /api/v1/me and every profile-mutating endpoint
 * (POST /profile/complete, PATCH /profile, the avatar endpoints) - they
 * all return the same CurrentUser contract so the frontend never needs a
 * follow-up /me call after a mutation. Never include tokens, secrets, or
 * provider access tokens here - see docs/security.md.
 */
export class CurrentUserProfileDto {
  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  username!: string | null;

  @ApiProperty({ nullable: true, description: 'ISO date (YYYY-MM-DD), no time/timezone.' })
  birthDate!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty({
    nullable: true,
    description:
      'Resolved avatar URL: custom avatar (signed) > external (identity provider) > null. Never a stored/persistent URL - resolved fresh at read time.',
  })
  avatarUrl!: string | null;

  @ApiProperty({ nullable: true })
  countryCode!: string | null;

  @ApiProperty({ nullable: true })
  region!: string | null;

  @ApiProperty({ nullable: true })
  city!: string | null;
}

export class ProfileCompletionDto {
  @ApiProperty()
  completed!: boolean;

  @ApiProperty({ nullable: true })
  completedAt!: string | null;

  @ApiProperty()
  version!: number;

  @ApiProperty({ type: [String] })
  missingFields!: string[];
}

export class CurrentUserAccessDto {
  @ApiProperty()
  canUseApplication!: boolean;

  @ApiProperty({ nullable: true })
  redirectTo!: string | null;
}

export class CurrentUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  email: string | undefined;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({
    type: [String],
    description: 'Every identity provider linked to this account, e.g. ["email", "google"].',
  })
  providers!: string[];

  @ApiProperty({ type: CurrentUserProfileDto })
  profile!: CurrentUserProfileDto;

  @ApiProperty({ type: ProfileCompletionDto })
  profileCompletion!: ProfileCompletionDto;

  @ApiProperty({ type: CurrentUserAccessDto })
  access!: CurrentUserAccessDto;
}
