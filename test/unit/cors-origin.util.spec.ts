import { describe, expect, it } from 'vitest';
import { isOriginAllowed } from '../../src/common/utils/cors-origin.util';

describe('isOriginAllowed', () => {
  it('allows an exact match', () => {
    expect(isOriginAllowed('https://kokyu.darioreis.dev', ['https://kokyu.darioreis.dev'])).toBe(
      true,
    );
  });

  it('rejects an origin not in the allowlist', () => {
    expect(isOriginAllowed('https://evil.example.com', ['https://kokyu.darioreis.dev'])).toBe(
      false,
    );
  });

  it('matches a Vercel preview origin against a wildcard pattern', () => {
    const allowlist = ['https://kokyu-*-projetosdarioreisjr.vercel.app'];

    expect(
      isOriginAllowed('https://kokyu-git-feature-x-projetosdarioreisjr.vercel.app', allowlist),
    ).toBe(true);
    expect(isOriginAllowed('https://kokyu-8f3a9c1-projetosdarioreisjr.vercel.app', allowlist)).toBe(
      true,
    );
  });

  it('does not let the wildcard cross a host boundary', () => {
    const allowlist = ['https://kokyu-*-projetosdarioreisjr.vercel.app'];

    expect(
      isOriginAllowed('https://kokyu-x-projetosdarioreisjr.vercel.app.evil.com', allowlist),
    ).toBe(false);
  });

  it('treats regex special characters in the pattern literally', () => {
    expect(isOriginAllowed('https://kokyuXdarioreis.dev', ['https://kokyu.darioreis.dev'])).toBe(
      false,
    );
  });
});
