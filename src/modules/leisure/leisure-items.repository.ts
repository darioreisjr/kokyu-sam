import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InternalError } from '../../common/errors/app.error';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { Database, Json } from '../../infrastructure/supabase/database.types';
import { LeisureItemType } from './constants/leisure-enums.constant';
import {
  LeisureItem,
  LeisureItemCreateInput,
  LeisureItemListFilter,
  LeisureItemUpdateInput,
} from './types/leisure-item.type';
import {
  LeisureCoverUploadTarget,
  LeisureItemsRepository,
} from './types/leisure-items-repository.interface';

type LeisureItemRow = Database['public']['Tables']['leisure_items']['Row'];

const LEISURE_COVERS_BUCKET = 'leisure-covers';

/**
 * Supabase-backed implementation of LeisureItemsRepository. Always queries
 * through a user-scoped client, so results are constrained by the table's
 * RLS policies (see supabase/migrations) - this repository never uses the
 * admin client.
 */
@Injectable()
export class SupabaseLeisureItemsRepository implements LeisureItemsRepository {
  constructor(private readonly supabase: SupabaseClientFactoryService) {}

  async findAll(accessToken: string, filter: LeisureItemListFilter): Promise<LeisureItem[]> {
    const client = this.supabase.getUserScopedClient(accessToken);

    let query = client.from('leisure_items').select('*').order('created_at', { ascending: false });

    if (filter.type) query = query.eq('type', filter.type);
    if (filter.status) query = query.eq('status', filter.status);
    if (filter.favorite !== undefined) query = query.eq('favorite', filter.favorite);
    if (filter.tag) query = query.contains('tags', [filter.tag]);
    if (filter.search) query = query.ilike('title', `%${filter.search}%`);

    const { data, error } = await query;
    if (error) throw mapSupabaseError(error);

    return (data ?? []).map((row) => this.toDomain(row));
  }

  async findById(accessToken: string, id: string): Promise<LeisureItem | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('leisure_items')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw mapSupabaseError(error);

    return data ? this.toDomain(data) : null;
  }

  async create(
    accessToken: string,
    userId: string,
    input: LeisureItemCreateInput,
  ): Promise<LeisureItem> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const insert: Database['public']['Tables']['leisure_items']['Insert'] = {
      user_id: userId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'backlog',
      cover_image: input.coverImage ?? null,
      tags: input.tags ?? [],
      priority: input.priority ?? null,
      estimated_duration: input.estimatedDuration ?? null,
      duration_type: input.durationType ?? 'unknown',
      minimum_useful_duration: input.minimumUsefulDuration ?? null,
      favorite: input.favorite ?? false,
      source: input.source ?? null,
      source_url: input.sourceUrl ?? null,
      recommended_by: input.recommendedBy ?? null,
      details: input.details as Json,
    };

    const { data, error } = await client.from('leisure_items').insert(insert).select('*').single();
    if (error) throw mapSupabaseError(error);

    return this.toDomain(data);
  }

  async update(
    accessToken: string,
    id: string,
    patch: LeisureItemUpdateInput,
  ): Promise<LeisureItem | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const update: Database['public']['Tables']['leisure_items']['Update'] = {};
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.coverImage !== undefined) update.cover_image = patch.coverImage;
    if (patch.tags !== undefined) update.tags = patch.tags;
    if (patch.priority !== undefined) update.priority = patch.priority;
    if (patch.estimatedDuration !== undefined) update.estimated_duration = patch.estimatedDuration;
    if (patch.durationType !== undefined) update.duration_type = patch.durationType;
    if (patch.minimumUsefulDuration !== undefined) {
      update.minimum_useful_duration = patch.minimumUsefulDuration;
    }
    if (patch.favorite !== undefined) update.favorite = patch.favorite;
    if (patch.source !== undefined) update.source = patch.source;
    if (patch.sourceUrl !== undefined) update.source_url = patch.sourceUrl;
    if (patch.recommendedBy !== undefined) update.recommended_by = patch.recommendedBy;
    if (patch.type !== undefined) update.type = patch.type;
    if (patch.details !== undefined) update.details = patch.details as Json;

    const { data, error } = await client
      .from('leisure_items')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw mapSupabaseError(error);

    return data ? this.toDomain(data) : null;
  }

  async delete(accessToken: string, id: string): Promise<void> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { error } = await client.from('leisure_items').delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
  }

  async createCoverUploadUrl(
    accessToken: string,
    userId: string,
    fileExtension: string,
  ): Promise<LeisureCoverUploadTarget> {
    const client = this.supabase.getUserScopedClient(accessToken);
    const path = `${userId}/${randomUUID()}.${fileExtension}`;

    const { data, error } = await client.storage
      .from(LEISURE_COVERS_BUCKET)
      .createSignedUploadUrl(path);

    if (error) {
      throw new InternalError();
    }

    return { path: data.path, token: data.token, signedUrl: data.signedUrl };
  }

  private toDomain(row: LeisureItemRow): LeisureItem {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as LeisureItemType,
      title: row.title,
      description: row.description,
      status: row.status as LeisureItem['status'],
      coverImage: row.cover_image,
      tags: row.tags,
      priority: row.priority as LeisureItem['priority'],
      estimatedDuration: row.estimated_duration,
      durationType: row.duration_type as LeisureItem['durationType'],
      minimumUsefulDuration: row.minimum_useful_duration,
      favorite: row.favorite,
      source: row.source,
      sourceUrl: row.source_url,
      recommendedBy: row.recommended_by,
      details: (row.details ?? {}) as Record<string, unknown>,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at,
    };
  }
}
