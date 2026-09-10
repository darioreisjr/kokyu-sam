import { Injectable } from '@nestjs/common';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { LeisureSummaryBase } from './types/leisure-summary.type';
import { LeisureSummaryRepository } from './types/leisure-summary-repository.interface';

@Injectable()
export class SupabaseLeisureSummaryRepository implements LeisureSummaryRepository {
  constructor(private readonly supabase: SupabaseClientFactoryService) {}

  // `plannedToday` isn't computed here - see `LeisureSummaryRepository`'s
  // doc comment - so neither of these two remaining queries needs a date.
  async getSummary(accessToken: string): Promise<LeisureSummaryBase> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const [inProgressResult, backlogResult] = await Promise.all([
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

    if (inProgressResult.error) throw mapSupabaseError(inProgressResult.error);
    if (backlogResult.error) throw mapSupabaseError(backlogResult.error);

    const inProgress = inProgressResult.data;

    return {
      inProgress: inProgress
        ? { id: inProgress.id, title: inProgress.title, type: inProgress.type }
        : null,
      backlogCount: backlogResult.count ?? 0,
    };
  }

  async getItemType(accessToken: string, itemId: string): Promise<string | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('leisure_items')
      .select('type')
      .eq('id', itemId)
      .maybeSingle();
    if (error) throw mapSupabaseError(error);

    return data?.type ?? null;
  }
}
