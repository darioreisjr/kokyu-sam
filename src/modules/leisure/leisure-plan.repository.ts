import { Injectable } from '@nestjs/common';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { Database } from '../../infrastructure/supabase/database.types';
import { LeisureRecurrence } from './constants/leisure-enums.constant';
import {
  LeisurePlanEntry,
  LeisurePlanEntryCreateInput,
  LeisurePlanEntryUpdateInput,
} from './types/leisure-plan-entry.type';
import { LeisurePlanRepository } from './types/leisure-plan-repository.interface';

type PlanEntryRow = Database['public']['Tables']['leisure_plan_entries']['Row'];

@Injectable()
export class SupabaseLeisurePlanRepository implements LeisurePlanRepository {
  constructor(private readonly supabase: SupabaseClientFactoryService) {}

  async findByDateRange(
    accessToken: string,
    startDate: string,
    endDate: string,
  ): Promise<LeisurePlanEntry[]> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('leisure_plan_entries')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    if (error) throw mapSupabaseError(error);

    return (data ?? []).map((row) => this.toDomain(row));
  }

  async findById(accessToken: string, id: string): Promise<LeisurePlanEntry | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('leisure_plan_entries')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw mapSupabaseError(error);

    return data ? this.toDomain(data) : null;
  }

  async create(
    accessToken: string,
    userId: string,
    input: LeisurePlanEntryCreateInput,
  ): Promise<LeisurePlanEntry> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const insert: Database['public']['Tables']['leisure_plan_entries']['Insert'] = {
      user_id: userId,
      leisure_item_id: input.leisureItemId ?? null,
      title: input.title,
      date: input.date,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      duration: input.duration ?? null,
      recurrence: input.recurrence ?? 'none',
      notes: input.notes ?? null,
      reminder: input.reminder ?? false,
      completed: input.completed ?? false,
    };

    const { data, error } = await client
      .from('leisure_plan_entries')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);

    return this.toDomain(data);
  }

  async update(
    accessToken: string,
    id: string,
    patch: LeisurePlanEntryUpdateInput,
  ): Promise<LeisurePlanEntry | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const update: Database['public']['Tables']['leisure_plan_entries']['Update'] = {};
    if (patch.leisureItemId !== undefined) update.leisure_item_id = patch.leisureItemId;
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.date !== undefined) update.date = patch.date;
    if (patch.startTime !== undefined) update.start_time = patch.startTime;
    if (patch.endTime !== undefined) update.end_time = patch.endTime;
    if (patch.duration !== undefined) update.duration = patch.duration;
    if (patch.recurrence !== undefined) update.recurrence = patch.recurrence;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.reminder !== undefined) update.reminder = patch.reminder;
    if (patch.completed !== undefined) update.completed = patch.completed;

    const { data, error } = await client
      .from('leisure_plan_entries')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw mapSupabaseError(error);

    return data ? this.toDomain(data) : null;
  }

  async delete(accessToken: string, id: string): Promise<void> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { error } = await client.from('leisure_plan_entries').delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
  }

  private toDomain(row: PlanEntryRow): LeisurePlanEntry {
    return {
      id: row.id,
      userId: row.user_id,
      leisureItemId: row.leisure_item_id,
      title: row.title,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      recurrence: row.recurrence as LeisureRecurrence,
      notes: row.notes,
      reminder: row.reminder,
      completed: row.completed,
      createdAt: row.created_at,
    };
  }
}
