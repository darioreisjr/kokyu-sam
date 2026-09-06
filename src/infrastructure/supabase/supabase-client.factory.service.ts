import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { supabaseConfig } from '../../config/supabase.config';
import {
  createAdminClient,
  createPublicClient,
  createUserScopedClient,
  TypedSupabaseClient,
} from './factories/supabase-client.factory';

/**
 * Single point of construction for every Supabase client used by the
 * application. Nothing outside this file should call `createClient`
 * directly (see docs/architecture.md - "Supabase clients").
 *
 * Clients are cheap to construct (no network call happens until a query is
 * issued), so we create a fresh user-scoped client per request rather than
 * using Nest's request-scoped DI, which would add DI-graph overhead on
 * every serverless invocation.
 */
@Injectable()
export class SupabaseClientFactoryService {
  private readonly publicClient: TypedSupabaseClient;
  private adminClient: TypedSupabaseClient | undefined;

  constructor(
    @Inject(supabaseConfig.KEY)
    private readonly config: ConfigType<typeof supabaseConfig>,
  ) {
    this.publicClient = createPublicClient(this.config);
  }

  getPublicClient(): TypedSupabaseClient {
    return this.publicClient;
  }

  getUserScopedClient(accessToken: string): TypedSupabaseClient {
    return createUserScopedClient(this.config, accessToken);
  }

  /**
   * Bypasses RLS. Exceptional use only - see docs/architecture.md.
   */
  getAdminClient(): TypedSupabaseClient {
    this.adminClient ??= createAdminClient(this.config);
    return this.adminClient;
  }
}
