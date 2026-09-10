import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/auth/types/authenticated-user.type';
import { LeisurePlanService } from './leisure-plan.service';
import { LeisureHomeItemRef, LeisureSummary } from './types/leisure-summary.type';
import {
  LEISURE_SUMMARY_REPOSITORY,
  LeisureSummaryRepository,
} from './types/leisure-summary-repository.interface';

// Sorts before any real "HH:mm"/"HH:mm:ss" string, so an entry with no
// startTime is treated as *last* - matches the previous SQL query's
// `order('start_time', { ascending: true, nullsFirst: false })`.
const NO_START_TIME_SORT_KEY = '￿';

@Injectable()
export class LeisureSummaryService {
  constructor(
    @Inject(LEISURE_SUMMARY_REPOSITORY)
    private readonly repository: LeisureSummaryRepository,
    private readonly planService: LeisurePlanService,
  ) {}

  async getSummary(user: AuthenticatedUser, date: string): Promise<LeisureSummary> {
    const [base, planEntries] = await Promise.all([
      this.repository.getSummary(user.accessToken),
      // `findByDateRange`, not a raw `date = today` query - a daily/weekly
      // entry anchored on an earlier date must still count as "planned
      // today" here, exactly as it now does on the Planejamento screen.
      this.planService.findByDateRange(user, date, date),
    ]);

    return {
      ...base,
      plannedToday: await this.resolvePlannedToday(user, planEntries),
    };
  }

  private async resolvePlannedToday(
    user: AuthenticatedUser,
    planEntries: Awaited<ReturnType<LeisurePlanService['findByDateRange']>>,
  ): Promise<LeisureHomeItemRef | null> {
    const next = [...planEntries]
      .filter((entry) => !entry.completed)
      .sort((a, b) =>
        (a.startTime ?? NO_START_TIME_SORT_KEY).localeCompare(
          b.startTime ?? NO_START_TIME_SORT_KEY,
        ),
      )[0];
    if (!next) return null;

    const type = next.leisureItemId
      ? await this.repository.getItemType(user.accessToken, next.leisureItemId)
      : null;

    return {
      id: next.id,
      title: next.title,
      type: type ?? 'custom',
      startTime: next.startTime,
    };
  }
}
