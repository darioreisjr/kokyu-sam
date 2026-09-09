import { Injectable } from '@nestjs/common';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { TypedSupabaseClient } from '../../infrastructure/supabase/factories/supabase-client.factory';
import { Database } from '../../infrastructure/supabase/database.types';
import {
  LeisureCollection,
  LeisureCollectionCreateInput,
  LeisureCollectionUpdateInput,
} from './types/leisure-collection.type';
import { LeisureCollectionsRepository } from './types/leisure-collections-repository.interface';

type CollectionRow = Database['public']['Tables']['leisure_collections']['Row'];

@Injectable()
export class SupabaseLeisureCollectionsRepository implements LeisureCollectionsRepository {
  constructor(private readonly supabase: SupabaseClientFactoryService) {}

  async findAll(accessToken: string): Promise<LeisureCollection[]> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('leisure_collections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw mapSupabaseError(error);

    return Promise.all((data ?? []).map((row) => this.toDomain(client, row)));
  }

  async findById(accessToken: string, id: string): Promise<LeisureCollection | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('leisure_collections')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw mapSupabaseError(error);

    return data ? this.toDomain(client, data) : null;
  }

  async create(
    accessToken: string,
    userId: string,
    input: LeisureCollectionCreateInput,
  ): Promise<LeisureCollection> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('leisure_collections')
      .insert({ user_id: userId, name: input.name, description: input.description ?? null })
      .select('*')
      .single();
    if (error) throw mapSupabaseError(error);

    const itemIds = input.itemIds ?? [];
    if (itemIds.length > 0) {
      const rows = itemIds.map((itemId) => ({
        collection_id: data.id,
        item_id: itemId,
        user_id: userId,
      }));
      const { error: linkError } = await client.from('leisure_collection_items').insert(rows);
      if (linkError) throw mapSupabaseError(linkError);
    }

    return this.toDomain(client, data);
  }

  async update(
    accessToken: string,
    id: string,
    patch: LeisureCollectionUpdateInput,
  ): Promise<LeisureCollection | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const update: Database['public']['Tables']['leisure_collections']['Update'] = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.description !== undefined) update.description = patch.description;

    const { data, error } = await client
      .from('leisure_collections')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw mapSupabaseError(error);

    return data ? this.toDomain(client, data) : null;
  }

  async delete(accessToken: string, id: string): Promise<void> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { error } = await client.from('leisure_collections').delete().eq('id', id);
    if (error) throw mapSupabaseError(error);
  }

  async addItem(
    accessToken: string,
    userId: string,
    collectionId: string,
    itemId: string,
  ): Promise<LeisureCollection | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    // upsert: adding an item already in the collection is a no-op, not a
    // unique_violation - matches the mock's own "if already present, return
    // as-is" behavior.
    const { error } = await client
      .from('leisure_collection_items')
      .upsert(
        { collection_id: collectionId, item_id: itemId, user_id: userId },
        { onConflict: 'collection_id,item_id', ignoreDuplicates: true },
      );
    if (error) throw mapSupabaseError(error);

    return this.findById(accessToken, collectionId);
  }

  async removeItem(
    accessToken: string,
    collectionId: string,
    itemId: string,
  ): Promise<LeisureCollection | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { error } = await client
      .from('leisure_collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('item_id', itemId);
    if (error) throw mapSupabaseError(error);

    return this.findById(accessToken, collectionId);
  }

  private async toDomain(
    client: TypedSupabaseClient,
    row: CollectionRow,
  ): Promise<LeisureCollection> {
    const { data, error } = await client
      .from('leisure_collection_items')
      .select('item_id')
      .eq('collection_id', row.id)
      .order('added_at', { ascending: true });
    if (error) throw mapSupabaseError(error);

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      itemIds: (data ?? []).map((entry) => entry.item_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
