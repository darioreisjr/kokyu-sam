import { Injectable } from '@nestjs/common';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { Database } from '../../infrastructure/supabase/database.types';
import { LeisureItemType } from './constants/leisure-enums.constant';
import {
  LeisureHistoryFilter,
  LeisureLogEntry,
  LeisureLogEntryCreateInput,
} from './types/leisure-log-entry.type';
import { LeisureHistoryRepository } from './types/leisure-history-repository.interface';

type LogEntryRow = Database['public']['Tables']['leisure_log_entries']['Row'];

const DEFAULT_HISTORY_LIMIT = 100;

@Injectable()
export class SupabaseLeisureHistoryRepository implements LeisureHistoryRepository {
  constructor(private readonly supabase: SupabaseClientFactoryService) {}

  async findAll(accessToken: string, filter: LeisureHistoryFilter): Promise<LeisureLogEntry[]> {
    const client = this.supabase.getUserScopedClient(accessToken);

    let query = client
      .from('leisure_log_entries')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(filter.limit ?? DEFAULT_HISTORY_LIMIT);

    if (filter.leisureItemId) query = query.eq('leisure_item_id', filter.leisureItemId);

    const { data, error } = await query;
    if (error) throw mapSupabaseError(error);

    return (data ?? []).map((row) => this.toDomain(row));
  }

  async create(
    accessToken: string,
    userId: string,
    input: LeisureLogEntryCreateInput,
  ): Promise<LeisureLogEntry> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const insert: Database['public']['Tables']['leisure_log_entries']['Insert'] = {
      user_id: userId,
      leisure_item_id: input.leisureItemId ?? null,
      activity_type: input.activityType,
      title: input.title,
      started_at: input.startedAt ?? null,
      completed_at: input.completedAt,
      duration: input.duration ?? null,
      rating: input.rating ?? null,
      notes: input.notes ?? null,
    };

    const { data, error } = await client
      .from('leisure_log_entries')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);

    return this.toDomain(data);
  }

  private toDomain(row: LogEntryRow): LeisureLogEntry {
    return {
      id: row.id,
      userId: row.user_id,
      leisureItemId: row.leisure_item_id,
      activityType: row.activity_type as LeisureItemType,
      title: row.title,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration,
      rating: row.rating,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}
