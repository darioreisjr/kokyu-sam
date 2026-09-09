import { LeisureNoteType } from '../constants/leisure-enums.constant';

export interface ChecklistNoteItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface LeisureNoteRelatedEntity {
  entityType: 'leisureItem';
  entityId: string;
}

export interface LeisureNote {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  type: LeisureNoteType;
  checklistItems: ChecklistNoteItem[] | null;
  linkUrl: string | null;
  tags: string[];
  pinned: boolean;
  archived: boolean;
  reminderDate: string | null;
  relatedEntity: LeisureNoteRelatedEntity | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeisureNoteCreateInput {
  title?: string | null;
  content: string;
  type: LeisureNoteType;
  checklistItems?: ChecklistNoteItem[] | null;
  linkUrl?: string | null;
  tags?: string[];
  pinned?: boolean;
  archived?: boolean;
  reminderDate?: string | null;
  relatedEntity?: LeisureNoteRelatedEntity | null;
}

export type LeisureNoteUpdateInput = Partial<LeisureNoteCreateInput>;

export interface LeisureNoteListFilter {
  pinned?: boolean;
  archived?: boolean;
  tag?: string;
  relatedItemId?: string;
}
