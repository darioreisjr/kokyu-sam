import { ApiProperty } from '@nestjs/swagger';

export class LeisurePlanEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  leisureItemId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ description: "YYYY-MM-DD, the series' anchor/start date." })
  date!: string;

  @ApiProperty({
    description:
      'YYYY-MM-DD, the specific day this instance falls on - equal to `date` unless this is a daily/weekly occurrence returned by GET /leisure/plan.',
  })
  occurrenceDate!: string;

  @ApiProperty({ nullable: true })
  startTime!: string | null;

  @ApiProperty({ nullable: true })
  endTime!: string | null;

  @ApiProperty({ nullable: true })
  duration!: number | null;

  @ApiProperty()
  recurrence!: string;

  @ApiProperty({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  reminder!: boolean;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({
    description:
      'Soft-removal flag - the only way a plan entry is ever "deleted". Reversible via POST :id/unarchive.',
  })
  archived!: boolean;

  @ApiProperty({ nullable: true })
  archivedAt!: string | null;
}
