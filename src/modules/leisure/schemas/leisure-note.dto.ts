import { ApiProperty } from '@nestjs/swagger';

export class ChecklistNoteItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  checked!: boolean;
}

export class LeisureNoteRelatedEntityDto {
  @ApiProperty({ enum: ['leisureItem'] })
  entityType!: 'leisureItem';

  @ApiProperty()
  entityId!: string;
}

export class LeisureNoteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty({ type: [ChecklistNoteItemDto], nullable: true })
  checklistItems!: ChecklistNoteItemDto[] | null;

  @ApiProperty({ nullable: true })
  linkUrl!: string | null;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty()
  pinned!: boolean;

  @ApiProperty()
  archived!: boolean;

  @ApiProperty({ nullable: true })
  reminderDate!: string | null;

  @ApiProperty({ type: LeisureNoteRelatedEntityDto, nullable: true })
  relatedEntity!: LeisureNoteRelatedEntityDto | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
