import { ApiProperty } from '@nestjs/swagger';

export class LeisureItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    description: 'One of the 16 leisure item types (e.g. "movie", "book", "unsorted").',
  })
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  coverImage!: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty({ nullable: true })
  priority!: string | null;

  @ApiProperty({ nullable: true })
  estimatedDuration!: number | null;

  @ApiProperty()
  durationType!: string;

  @ApiProperty({ nullable: true })
  minimumUsefulDuration!: number | null;

  @ApiProperty()
  favorite!: boolean;

  @ApiProperty({ nullable: true })
  source!: string | null;

  @ApiProperty({ nullable: true })
  sourceUrl!: string | null;

  @ApiProperty({ nullable: true })
  recommendedBy!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ nullable: true })
  archivedAt!: string | null;
}

export class LeisureCoverUploadUrlResponseDto {
  @ApiProperty({ description: 'Storage object path the client must upload to.' })
  path!: string;

  @ApiProperty({ description: 'One-time token to pair with the signed upload URL.' })
  token!: string;

  @ApiProperty({ description: 'Signed URL the client PUTs the file to directly.' })
  signedUrl!: string;
}

/**
 * The actual wire shape adds one more key, named by `type` (e.g.
 * `movie: { runtime: 120 }`) - never a generic `details` key, matching the
 * frontend's discriminated union. Not statically modeled as a Swagger
 * property (the key name is dynamic), documented here for API consumers
 * instead. LeisureItemsController.toResponse builds this shape.
 */
export type LeisureItemResponse = LeisureItemDto & Record<string, unknown>;
