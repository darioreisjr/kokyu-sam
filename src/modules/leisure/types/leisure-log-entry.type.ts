import { LeisureItemType } from '../constants/leisure-enums.constant';

export interface LeisureLogEntry {
  id: string;
  userId: string;
  leisureItemId: string | null;
  activityType: LeisureItemType;
  title: string;
  startedAt: string | null;
  completedAt: string;
  duration: number | null;
  rating: number | null;
  notes: string | null;
  createdAt: string;
}

export interface LeisureLogEntryCreateInput {
  leisureItemId?: string | null;
  activityType: LeisureItemType;
  title: string;
  startedAt?: string | null;
  completedAt: string;
  duration?: number | null;
  rating?: number | null;
  notes?: string | null;
}

export interface LeisureHistoryFilter {
  leisureItemId?: string;
  /** Caps how many rows come back (default 100, max 500) - the logbook can grow unbounded over time, so a request never accidentally pulls the whole history. */
  limit?: number;
}
