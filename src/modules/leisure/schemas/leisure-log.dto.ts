import { ApiProperty } from '@nestjs/swagger';

export class LeisureLogEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  leisureItemId!: string | null;

  @ApiProperty()
  activityType!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  startedAt!: string | null;

  @ApiProperty()
  completedAt!: string;

  @ApiProperty({ nullable: true })
  duration!: number | null;

  @ApiProperty({ nullable: true })
  rating!: number | null;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: string;
}
