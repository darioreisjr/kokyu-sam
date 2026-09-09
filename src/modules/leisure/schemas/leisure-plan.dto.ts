import { ApiProperty } from '@nestjs/swagger';

export class LeisurePlanEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  leisureItemId!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  date!: string;

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
}
