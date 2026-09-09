import { LeisureRecurrence } from '../constants/leisure-enums.constant';

export interface LeisurePlanEntry {
  id: string;
  userId: string;
  leisureItemId: string | null;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  recurrence: LeisureRecurrence;
  notes: string | null;
  reminder: boolean;
  completed: boolean;
  createdAt: string;
}

export interface LeisurePlanEntryCreateInput {
  leisureItemId?: string | null;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  duration?: number | null;
  recurrence?: LeisureRecurrence;
  notes?: string | null;
  reminder?: boolean;
  completed?: boolean;
}

export type LeisurePlanEntryUpdateInput = Partial<LeisurePlanEntryCreateInput>;
