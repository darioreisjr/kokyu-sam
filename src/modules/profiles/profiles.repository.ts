import { Injectable } from '@nestjs/common';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { Database } from '../../infrastructure/supabase/database.types';
import { Profile } from './types/profile.type';
import { ProfilesRepository } from './types/profiles-repository.interface';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Supabase-backed implementation of ProfilesRepository. Always queries
 * through a user-scoped client so results are constrained by RLS - this
 * repository never uses the admin client.
 */
@Injectable()
export class SupabaseProfilesRepository implements ProfilesRepository {
  constructor(private readonly supabase: SupabaseClientFactoryService) {}

  async findById(userId: string, accessToken: string): Promise<Profile | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw mapSupabaseError(error);
    }

    return data ? this.toDomain(data) : null;
  }

  private toDomain(row: ProfileRow): Profile {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      birthDate: row.birth_date,
      avatarUrl: row.avatar_url,
      onboardingComplete: row.onboarding_complete,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
