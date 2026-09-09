import { Injectable } from '@nestjs/common';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { LeisureSummary } from './types/leisure-summary.type';
import { LeisureSummaryRepository } from './types/leisure-summary-repository.interface';

@Injectable()
export class SupabaseLeisureSummaryRepository implements LeisureSummaryRepository {
  constructor(private readonly supabase: SupabaseClientFactoryService) {}

  async getSummary(accessToken: string, date: string): Promise<LeisureSummary> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const [plannedResult, inProgressResult, backlogResult] = await Promise.all([
      client
        .from('leisure_plan_entries')
        .select('id, title, start_time, leisure_item_id, leisure_items(type)')
        .eq('date', date)
        .eq('completed', false)
        .order('start_time', { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      client
        .from('leisure_items')
        .select('id, title, type')
        .eq('status', 'inProgress')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from('leisure_items')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'unsorted'),
    ]);

    if (plannedResult.error) throw mapSupabaseError(plannedResult.error);
    if (inProgressResult.error) throw mapSupabaseError(inProgressResult.error);
    if (backlogResult.error) throw mapSupabaseError(backlogResult.error);

    const planned = plannedResult.data;
    const inProgress = inProgressResult.data;

    return {
      plannedToday: planned
        ? {
            id: planned.id,
            title: planned.title,
            type: planned.leisure_items?.type ?? 'custom',
            startTime: planned.start_time,
          }
        : null,
      inProgress: inProgress
        ? { id: inProgress.id, title: inProgress.title, type: inProgress.type }
        : null,
      backlogCount: backlogResult.count ?? 0,
    };
  }
}
