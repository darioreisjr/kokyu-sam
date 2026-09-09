import { ApiProperty } from '@nestjs/swagger';

export class LeisureHomeItemRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty({ required: false, nullable: true })
  startTime?: string | null;
}

export class LeisureSummaryDto {
  @ApiProperty({ type: LeisureHomeItemRefDto, nullable: true })
  plannedToday!: LeisureHomeItemRefDto | null;

  @ApiProperty({ type: LeisureHomeItemRefDto, nullable: true })
  inProgress!: LeisureHomeItemRefDto | null;

  @ApiProperty()
  backlogCount!: number;
}
