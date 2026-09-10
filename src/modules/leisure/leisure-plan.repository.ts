import { Injectable } from '@nestjs/common';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { Database } from '../../infrastructure/supabase/database.types';
import { LeisureRecurrence } from './constants/leisure-enums.constant';
import { toHm } from './leisure-plan-date.util';
import { occurrenceCompletionKey } from './leisure-plan-recurrence.util';
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

    // Candidates for [startDate, endDate], not the final answer: a
    // recurring row anchored *before* startDate can still recur into the
    // range, so it's kept even though its own `date` is outside
    // [startDate, endDate]. The caller (LeisurePlanService) expands these
    // into actual occurrences via `expandPlanEntriesForRange`.
    const { data, error } = await client
      .from('leisure_plan_entries')
      .select('*')
      .lte('date', endDate)
      .or(`recurrence.neq.none,date.gte.${startDate}`)
      .order('date', { ascending: true });
    if (error) throw mapSupabaseError(error);

    return (data ?? []).map((row) => this.toDomain(row));
  }

  async findCompletedOccurrences(
    accessToken: string,
    startDate: string,
    endDate: string,
  ): Promise<Set<string>> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('leisure_plan_entry_completions')
      .select('plan_entry_id, occurrence_date')
      .gte('occurrence_date', startDate)
      .lte('occurrence_date', endDate);
    if (error) throw mapSupabaseError(error);

    return new Set(
      (data ?? []).map((row) => occurrenceCompletionKey(row.plan_entry_id, row.occurrence_date)),
    );
  }

  async markOccurrenceCompleted(
    accessToken: string,
    userId: string,
    planEntryId: string,
    occurrenceDate: string,
  ): Promise<boolean> {
    const client = this.supabase.getUserScopedClient(accessToken);

    // `ignoreDuplicates` compiles to `ON CONFLICT DO NOTHING` - a skipped
    // conflict row never comes back in `RETURNING`, so an empty `data`
    // reliably means "already completed", not just "nothing selected".
    const { data, error } = await client
      .from('leisure_plan_entry_completions')
      .upsert(
        { user_id: userId, plan_entry_id: planEntryId, occurrence_date: occurrenceDate },
        { onConflict: 'plan_entry_id,occurrence_date', ignoreDuplicates: true },
      )
      .select('plan_entry_id');
    if (error) throw mapSupabaseError(error);

    return (data ?? []).length > 0;
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
      // Overridden by `expandPlanEntriesForRange` when this row produces
      // more than one occurrence within a requested range.
      occurrenceDate: row.date,
      startTime: toHm(row.start_time),
      endTime: toHm(row.end_time),
      duration: row.duration,
      recurrence: row.recurrence as LeisureRecurrence,
      notes: row.notes,
      reminder: row.reminder,
      completed: row.completed,
      createdAt: row.created_at,
    };
  }
}
