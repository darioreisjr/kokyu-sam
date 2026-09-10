import {
  LeisurePlanEntry,
  LeisurePlanEntryCreateInput,
  LeisurePlanEntryUpdateInput,
} from './leisure-plan-entry.type';

export const LEISURE_PLAN_REPOSITORY = Symbol('LEISURE_PLAN_REPOSITORY');

export interface LeisurePlanRepository {
  findByDateRange: (
    accessToken: string,
    startDate: string,
    endDate: string,
  ) => Promise<LeisurePlanEntry[]>;
  findById: (accessToken: string, id: string) => Promise<LeisurePlanEntry | null>;
  create: (
    accessToken: string,
    userId: string,
    input: LeisurePlanEntryCreateInput,
  ) => Promise<LeisurePlanEntry>;
  update: (
    accessToken: string,
    id: string,
    patch: LeisurePlanEntryUpdateInput,
  ) => Promise<LeisurePlanEntry | null>;
  delete: (accessToken: string, id: string) => Promise<void>;
}
