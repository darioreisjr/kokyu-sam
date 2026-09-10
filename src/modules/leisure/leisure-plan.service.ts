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

@Injectable()
export class LeisurePlanService {
  constructor(
    @Inject(LEISURE_PLAN_REPOSITORY)
    private readonly repository: LeisurePlanRepository,
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
      await this.repository.markOccurrenceCompleted(user.accessToken, user.id, id, date);
      return { ...existing, occurrenceDate: date, completed: true };
    }

    return this.update(user, id, { completed: true });
  }
}
