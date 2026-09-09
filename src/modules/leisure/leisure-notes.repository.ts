import { Injectable } from '@nestjs/common';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { Database, Json } from '../../infrastructure/supabase/database.types';
import { LeisureNoteType } from './constants/leisure-enums.constant';
import {
  ChecklistNoteItem,
  LeisureNote,
  LeisureNoteCreateInput,
  LeisureNoteListFilter,
  LeisureNoteUpdateInput,
} from './types/leisure-note.type';
import { LeisureNotesRepository } from './types/leisure-notes-repository.interface';

type NoteRow = Database['public']['Tables']['leisure_notes']['Row'];

@Injectable()
export class SupabaseLeisureNotesRepository implements LeisureNotesRepository {
  constructor(private readonly supabase: SupabaseClientFactoryService) {}

  async findAll(accessToken: string, filter: LeisureNoteListFilter): Promise<LeisureNote[]> {
    const client = this.supabase.getUserScopedClient(accessToken);

    let query = client.from('leisure_notes').select('*').order('created_at', { ascending: false });

    if (filter.pinned !== undefined) query = query.eq('pinned', filter.pinned);
    if (filter.archived !== undefined) query = query.eq('archived', filter.archived);
    if (filter.tag) query = query.contains('tags', [filter.tag]);
    if (filter.relatedItemId) query = query.eq('related_leisure_item_id', filter.relatedItemId);

    const { data, error } = await query;
    if (error) throw mapSupabaseError(error);

    return (data ?? []).map((row) => this.toDomain(row));
  }

  async findById(accessToken: string, id: string): Promise<LeisureNote | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('leisure_notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw mapSupabaseError(error);

    return data ? this.toDomain(data) : null;
  }

  async create(
    accessToken: string,
    userId: string,
    input: LeisureNoteCreateInput,
  ): Promise<LeisureNote> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const insert: Database['public']['Tables']['leisure_notes']['Insert'] = {
      user_id: userId,
      title: input.title ?? null,
      content: input.content,
      type: input.type,
      checklist_items: (input.checklistItems ?? []) as unknown as Json,
      link_url: input.linkUrl ?? null,
      tags: input.tags ?? [],
      pinned: input.pinned ?? false,
      archived: input.archived ?? false,
      reminder_date: input.reminderDate ?? null,
      related_leisure_item_id: input.relatedEntity?.entityId ?? null,
    };

    const { data, error } = await client.from('leisure_notes').insert(insert).select('*').single();
    if (error) throw mapSupabaseError(error);

    return this.toDomain(data);
  }

  async update(
    accessToken: string,
    id: string,
    patch: LeisureNoteUpdateInput,
  ): Promise<LeisureNote | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const update: Database['public']['Tables']['leisure_notes']['Update'] = {};
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.content !== undefined) update.content = patch.content;
    if (patch.type !== undefined) update.type = patch.type;
    if (patch.checklistItems !== undefined) {
      update.checklist_items = (patch.checklistItems ?? []) as unknown as Json;
    }
    if (patch.linkUrl !== undefined) update.link_url = patch.linkUrl;
    if (patch.tags !== undefined) update.tags = patch.tags;
    if (patch.pinned !== undefined) update.pinned = patch.pinned;
    if (patch.archived !== undefined) update.archived = patch.archived;
    if (patch.reminderDate !== undefined) update.reminder_date = patch.reminderDate;
    if (patch.relatedEntity !== undefined) {
      update.related_leisure_item_id = patch.relatedEntity?.entityId ?? null;
    }

    const { data, error } = await client
      .from('leisure_notes')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw mapSupabaseError(error);

    return data ? this.toDomain(data) : null;
  }

  async delete(accessToken: string, id: string): Promise<void> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { error } = await client.from('leisure_notes').delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
  }

  private toDomain(row: NoteRow): LeisureNote {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      content: row.content,
      type: row.type as LeisureNoteType,
      checklistItems: (row.checklist_items as unknown as ChecklistNoteItem[] | null) ?? null,
      linkUrl: row.link_url,
      tags: row.tags,
      pinned: row.pinned,
      archived: row.archived,
      reminderDate: row.reminder_date,
      relatedEntity: row.related_leisure_item_id
        ? { entityType: 'leisureItem', entityId: row.related_leisure_item_id }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
