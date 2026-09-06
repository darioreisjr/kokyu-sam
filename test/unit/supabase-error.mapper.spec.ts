import { describe, expect, it } from 'vitest';
import { InternalError, ProfileNotFoundError } from '../../src/common/errors/app.error';
import { mapSupabaseError } from '../../src/common/errors/supabase-error.mapper';

describe('mapSupabaseError', () => {
  it('maps PGRST116 (no rows) to ProfileNotFoundError', () => {
    expect(mapSupabaseError({ code: 'PGRST116', message: 'no rows' })).toBeInstanceOf(
      ProfileNotFoundError,
    );
  });

  it('maps any other error to a generic InternalError without leaking details', () => {
    const error = mapSupabaseError({
      code: '42501',
      message: 'permission denied for table profiles',
    });

    expect(error).toBeInstanceOf(InternalError);
    expect(error.message).not.toContain('permission denied');
  });
});
