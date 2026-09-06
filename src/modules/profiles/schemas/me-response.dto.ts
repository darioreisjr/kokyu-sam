import { ApiProperty } from '@nestjs/swagger';

/**
 * Response shape for GET /api/v1/me. Never include tokens, secrets, or
 * provider access tokens here - see docs/security.md.
 */
export class MeUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false, nullable: true })
  email: string | undefined;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ description: 'Identity provider for this session, e.g. "email" or "google".' })
  provider!: string;
}

export class MeProfileDto {
  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  username!: string | null;

  @ApiProperty({ nullable: true })
  birthDate!: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;

  @ApiProperty()
  onboardingComplete!: boolean;
}

export class MeResponseDto {
  @ApiProperty({ type: MeUserDto })
  user!: MeUserDto;

  @ApiProperty({ type: MeProfileDto })
  profile!: MeProfileDto;
}
