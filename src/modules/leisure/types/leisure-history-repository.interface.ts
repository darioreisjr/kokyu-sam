import {
  LeisureHistoryFilter,
  LeisureLogEntry,
  LeisureLogEntryCreateInput,
} from './leisure-log-entry.type';

export const LEISURE_HISTORY_REPOSITORY = Symbol('LEISURE_HISTORY_REPOSITORY');

export interface LeisureHistoryRepository {
  findAll: (accessToken: string, filter: LeisureHistoryFilter) => Promise<LeisureLogEntry[]>;
  create: (
    accessToken: string,
    userId: string,
    input: LeisureLogEntryCreateInput,
  ) => Promise<LeisureLogEntry>;
}
