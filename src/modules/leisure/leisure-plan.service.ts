import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import {
  LeisurePlanEntryDateInvalidError,
  LeisurePlanEntryNotFoundError,
} from '../../common/errors/app.error';
import { findPastPlanEntryViolation } from './leisure-plan-date.util';
import { expandPlanEntriesForRange } from './leisure-plan-recurrence.util';
import {
  LeisurePlanEntry,
  LeisurePlanEntryCreateInput,
  LeisurePlanEntryUpdateInput,
} from './types/leisure-plan-entry.type';
import {
  LEISURE_PLAN_REPOSITORY,
  LeisurePlanRepository,
} from './types/leisure-plan-repository.interface';
import {
  LEISURE_HISTORY_REPOSITORY,
  LeisureHistoryRepository,
} from './types/leisure-history-repository.interface';
import {
  LEISURE_ITEMS_REPOSITORY,
  LeisureItemsRepository,
} from './types/leisure-items-repository.interface';

@Injectable()
export class LeisurePlanService {
  constructor(
    @Inject(LEISURE_PLAN_REPOSITORY)
    private readonly repository: LeisurePlanRepository,
    @Inject(LEISURE_HISTORY_REPOSITORY)
    private readonly historyRepository: LeisureHistoryRepository,
    @Inject(LEISURE_ITEMS_REPOSITORY)
    private readonly itemsRepository: LeisureItemsRepository,
  ) {}

  async findByDateRange(
    user: AuthenticatedUser,
    startDate: string,
    endDate: string,
  ): Promise<LeisurePlanEntry[]> {
    const [candidates, completedOccurrences] = await Promise.all([
      this.repository.findByDateRange(user.accessToken, startDate, endDate),
      this.repository.findCompletedOccurrences(user.accessToken, startDate, endDate),
    ]);

    return expandPlanEntriesForRange(candidates, startDate, endDate, completedOccurrences);
  }

  /** A single entry by id - the edit page's own fetch, independent of whatever range the planner list happened to have loaded. */
  async findById(user: AuthenticatedUser, id: string): Promise<LeisurePlanEntry> {
    const entry = await this.repository.findById(user.accessToken, id);
    if (!entry) throw new LeisurePlanEntryNotFoundError();
    return entry;
  }

  // `async` (rather than a plain function returning `this.repository.create(...)`)
  // so the past-date check's throw surfaces as a rejected Promise, not a
  // synchronous throw — the same contract every other method here has.
  async create(
    user: AuthenticatedUser,
    input: LeisurePlanEntryCreateInput,
  ): Promise<LeisurePlanEntry> {
    // No reference entry yet, so every field is a fresh pick — see
    // `findPastPlanEntryViolation`.
    const violation = findPastPlanEntryViolation(input);
    if (violation) throw new LeisurePlanEntryDateInvalidError(violation.message);

    return this.repository.create(user.accessToken, user.id, input);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    patch: LeisurePlanEntryUpdateInput,
  ): Promise<LeisurePlanEntry> {
    // Only a patch that actually touches date/startTime/endTime needs the
    // extra read — e.g. `complete()`'s `{ completed: true }` never does.
    if (patch.date !== undefined || patch.startTime !== undefined || patch.endTime !== undefined) {
      const existing = await this.repository.findById(user.accessToken, id);
      if (!existing) throw new LeisurePlanEntryNotFoundError();

      const violation = findPastPlanEntryViolation(patch, existing);
      if (violation) throw new LeisurePlanEntryDateInvalidError(violation.message);
    }

    const updated = await this.repository.update(user.accessToken, id, patch);
    if (!updated) throw new LeisurePlanEntryNotFoundError();
    return updated;
  }

  async delete(user: AuthenticatedUser, id: string): Promise<void> {
    await this.repository.delete(user.accessToken, id);
  }

  /**
   * `occurrenceDate` picks which day of a `'daily'`/`'weekly'` series is
   * being completed (defaults to the series' own anchor date) - recorded
   * in `leisure_plan_entry_completions` so it never affects any other
   * day. A `'none'`/`'custom'` entry has only ever had one day, so it
   * keeps going through `update()`'s `completed` column exactly as
   * before.
   *
   * Either path also appends a `leisure_log_entries` row, but only the
   * first time a given occurrence/entry is completed - re-completing (a
   * disabled button on the frontend, but nothing stops a direct API
   * call) must never duplicate the Histórico entry.
   */
  async complete(
    user: AuthenticatedUser,
    id: string,
    occurrenceDate?: string,
  ): Promise<LeisurePlanEntry> {
    const existing = await this.repository.findById(user.accessToken, id);
    if (!existing) throw new LeisurePlanEntryNotFoundError();

    if (existing.recurrence === 'daily' || existing.recurrence === 'weekly') {
      const date = occurrenceDate ?? existing.date;
      const wasNewCompletion = await this.repository.markOccurrenceCompleted(
        user.accessToken,
        user.id,
        id,
        date,
      );
      if (wasNewCompletion) await this.logCompletion(user, existing);
      return { ...existing, occurrenceDate: date, completed: true };
    }

    if (existing.completed) return existing;
    const updated = await this.update(user, id, { completed: true });
    // `existing`, not `updated` - a `{ completed: true }` patch never
    // touches leisureItemId/title/duration, and `existing` is the value
    // this method already validated, independent of whatever the
    // repository's `update()` happens to echo back.
    await this.logCompletion(user, existing);
    return updated;
  }

  /** Best-effort activity type: falls back to `'custom'` for an ad hoc entry (no `leisureItemId`) or one whose item has since been deleted. */
  private async logCompletion(user: AuthenticatedUser, entry: LeisurePlanEntry): Promise<void> {
    const item = entry.leisureItemId
      ? await this.itemsRepository.findById(user.accessToken, entry.leisureItemId)
      : null;

    await this.historyRepository.create(user.accessToken, user.id, {
      leisureItemId: entry.leisureItemId,
      activityType: item?.type ?? 'custom',
      title: entry.title,
      completedAt: new Date().toISOString(),
      duration: entry.duration,
    });
  }
}
