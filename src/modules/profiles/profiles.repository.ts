import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { mapSupabaseError } from '../../common/errors/supabase-error.mapper';
import { InternalError } from '../../common/errors/app.error';
import { SupabaseClientFactoryService } from '../../infrastructure/supabase/supabase-client.factory.service';
import { Database } from '../../infrastructure/supabase/database.types';
import { Profile, ProfileBootstrapPatch, ProfileMutationInput } from './types/profile.type';
import { AvatarUploadTarget, ProfilesRepository } from './types/profiles-repository.interface';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const AVATARS_BUCKET = 'avatars';
const AVATAR_SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Supabase-backed implementation of ProfilesRepository. Always queries
 * through a user-scoped client so results are constrained by RLS - this
 * repository never uses the admin client. Mutations that touch onboarding
 * state go through the complete_profile/update_profile RPCs rather than a
 * raw table UPDATE, so the database-level invariants in those functions
 * (see supabase/migrations) are always enforced, even if this repository
 * has a bug.
 */
@Injectable()
export class SupabaseProfilesRepository implements ProfilesRepository {
  constructor(private readonly supabase: SupabaseClientFactoryService) {}

  async findByUserId(userId: string, accessToken: string): Promise<Profile | null> {
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

  async getOnboardingStatus(
    userId: string,
    accessToken: string,
  ): Promise<{ onboardingCompletedAt: string | null; onboardingVersion: number } | null> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('profiles')
      .select('onboarding_completed_at, onboarding_version')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw mapSupabaseError(error);
    }

    return data
      ? {
          onboardingCompletedAt: data.onboarding_completed_at,
          onboardingVersion: data.onboarding_version,
        }
      : null;
  }

  async bootstrap(
    userId: string,
    accessToken: string,
    patch: ProfileBootstrapPatch,
  ): Promise<Profile> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const update: Database['public']['Tables']['profiles']['Update'] = {
      profile_bootstrapped_at: new Date().toISOString(),
    };
    if (patch.firstName !== undefined) update.first_name = patch.firstName;
    if (patch.lastName !== undefined) update.last_name = patch.lastName;
    if (patch.username !== undefined) update.username = patch.username;
    if (patch.birthDate !== undefined) update.birth_date = patch.birthDate;
    if (patch.avatarExternalUrl !== undefined) update.avatar_external_url = patch.avatarExternalUrl;

    const { data, error } = await client
      .from('profiles')
      .update(update)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    return this.toDomain(data);
  }

  async complete(accessToken: string, input: ProfileMutationInput): Promise<Profile> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client.rpc('complete_profile', {
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_username: input.username,
      p_birth_date: input.birthDate,
      p_bio: input.bio,
      p_country_code: input.countryCode,
      p_region: input.region,
      p_city: input.city,
    });

    if (error) {
      throw mapSupabaseError(error);
    }
    if (!data) {
      throw new InternalError();
    }

    return this.toDomain(data);
  }

  async update(accessToken: string, input: ProfileMutationInput): Promise<Profile> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client.rpc('update_profile', {
      p_first_name: input.firstName,
      p_last_name: input.lastName,
      p_username: input.username,
      p_birth_date: input.birthDate,
      p_bio: input.bio,
      p_country_code: input.countryCode,
      p_region: input.region,
      p_city: input.city,
    });

    if (error) {
      throw mapSupabaseError(error);
    }
    if (!data) {
      throw new InternalError();
    }

    return this.toDomain(data);
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const client = this.supabase.getPublicClient();

    const { data, error } = await client.rpc('is_username_available', { p_username: username });

    if (error) {
      throw mapSupabaseError(error);
    }

    return Boolean(data);
  }

  async setAvatar(userId: string, accessToken: string, avatarPath: string): Promise<Profile> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const { data, error } = await client
      .from('profiles')
      .update({ avatar_path: avatarPath })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    return this.toDomain(data);
  }

  async removeAvatar(userId: string, accessToken: string): Promise<Profile> {
    const client = this.supabase.getUserScopedClient(accessToken);

    const current = await this.findByUserId(userId, accessToken);

    const { data, error } = await client
      .from('profiles')
      .update({ avatar_path: null })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      throw mapSupabaseError(error);
    }

    if (current?.avatarPath) {
      // Best-effort: the DB update above is the source of truth for what
      // the API returns, so a failure to delete the now-orphaned storage
      // object must never fail the request.
      await client.storage.from(AVATARS_BUCKET).remove([current.avatarPath]);
    }

    return this.toDomain(data);
  }

  async createAvatarUploadUrl(
    userId: string,
    accessToken: string,
    fileExtension: string,
  ): Promise<AvatarUploadTarget> {
    const client = this.supabase.getUserScopedClient(accessToken);
    const path = `${userId}/${randomUUID()}.${fileExtension}`;

    const { data, error } = await client.storage.from(AVATARS_BUCKET).createSignedUploadUrl(path);

    if (error) {
      throw new InternalError();
    }

    return { path: data.path, token: data.token, signedUrl: data.signedUrl };
  }

  async resolveAvatarUrl(profile: Profile, accessToken: string): Promise<string | null> {
    if (profile.avatarPath) {
      const client = this.supabase.getUserScopedClient(accessToken);
      const { data, error } = await client.storage
        .from(AVATARS_BUCKET)
        .createSignedUrl(profile.avatarPath, AVATAR_SIGNED_URL_TTL_SECONDS);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
      // Fall through to the external avatar (or null) rather than failing
      // the whole request over a transient signing error.
    }

    return profile.avatarExternalUrl ?? null;
  }

  private toDomain(row: ProfileRow): Profile {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      username: row.username,
      birthDate: row.birth_date,
      bio: row.bio,
      avatarPath: row.avatar_path,
      avatarExternalUrl: row.avatar_external_url,
      countryCode: row.country_code,
      region: row.region,
      city: row.city,
      onboardingCompletedAt: row.onboarding_completed_at,
      onboardingVersion: row.onboarding_version,
      profileBootstrappedAt: row.profile_bootstrapped_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
