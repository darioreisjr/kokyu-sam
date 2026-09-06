import { describe, expect, it } from 'vitest';
import {
  birthDateSchema,
  emailSchema,
  passwordSchema,
  usernameSchema,
} from '../../src/common/utils/shared.schemas';

describe('emailSchema', () => {
  it('rejects an invalid email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('normalizes case and whitespace', () => {
    const result = emailSchema.safeParse('  User@Example.com  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('user@example.com');
    }
  });
});

describe('usernameSchema', () => {
  it('rejects an invalid username', () => {
    expect(usernameSchema.safeParse('a').success).toBe(false);
  });

  it('accepts a valid username', () => {
    expect(usernameSchema.safeParse('dario_dev').success).toBe(true);
  });
});

describe('birthDateSchema', () => {
  it('rejects a user younger than 18', () => {
    const seventeenYearsAgo = new Date();
    seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17);

    expect(birthDateSchema.safeParse(seventeenYearsAgo.toISOString()).success).toBe(false);
  });

  it('accepts a user older than 18', () => {
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);

    expect(birthDateSchema.safeParse(thirtyYearsAgo.toISOString()).success).toBe(true);
  });
});

describe('passwordSchema', () => {
  it('rejects a password shorter than 12 characters', () => {
    expect(passwordSchema.safeParse('Aa1!aaaa').success).toBe(false);
  });

  it('rejects a password missing a special character', () => {
    expect(passwordSchema.safeParse('Aaaaaaaaaa1').success).toBe(false);
  });

  it('accepts a password meeting every rule', () => {
    expect(passwordSchema.safeParse('Str0ng!Passw0rd').success).toBe(true);
  });
});
