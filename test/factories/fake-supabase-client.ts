/**
 * Minimal, hand-rolled fakes for the slice of the Supabase client surface
 * each unit test actually touches - avoids copying the real (large)
 * SupabaseClient type as a mock. See docs/testing.md - "Mock Supabase".
 */

export interface FakeGetClaimsResult {
  data: { claims: Record<string, unknown> } | null;
  error: { message: string } | null;
}

export function createFakeAuthClient(result: FakeGetClaimsResult): {
  auth: { getClaims: (jwt: string) => Promise<FakeGetClaimsResult> };
} {
  return {
    auth: {
      getClaims: () => Promise.resolve(result),
    },
  };
}

export interface FakeMaybeSingleResult<T> {
  data: T | null;
  error: { code?: string; message: string } | null;
}

export function createFakeProfilesClient<T>(result: FakeMaybeSingleResult<T>) {
  return {
    from: (_table: string) => ({
      select: (_columns: string) => ({
        eq: (_column: string, _value: string) => ({
          maybeSingle: () => Promise.resolve(result),
        }),
      }),
    }),
  };
}
