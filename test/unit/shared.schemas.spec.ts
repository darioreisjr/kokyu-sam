import { describe, expect, it } from 'vitest';
import {
  bioSchema,
  birthDateSchema,
  citySchema,
  countryCodeSchema,
  emailSchema,
  firstNameSchema,
  lastNameSchema,
  passwordSchema,
  profileBirthDateSchema,
  regionSchema,
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

  it('normalizes (trims, lowercases) before validating/persisting', () => {
    const result = usernameSchema.safeParse('  Dario_Dev  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('dario_dev');
    }
  });

  it('rejects a username that does not start with a letter', () => {
    expect(usernameSchema.safeParse('_dario').success).toBe(false);
    expect(usernameSchema.safeParse('1dario').success).toBe(false);
  });
});

describe('profileBirthDateSchema', () => {
  it('accepts a valid past date for someone over 18', () => {
    expect(profileBirthDateSchema.safeParse('1990-01-01').success).toBe(true);
  });

  it('rejects a malformed date string', () => {
    expect(profileBirthDateSchema.safeParse('01/01/1990').success).toBe(false);
  });

  it('rejects a non-existent calendar date', () => {
    expect(profileBirthDateSchema.safeParse('2024-02-30').success).toBe(false);
  });

  it('rejects a future date', () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const value = nextYear.toISOString().slice(0, 10);
    expect(profileBirthDateSchema.safeParse(value).success).toBe(false);
  });

  it('rejects someone under 18', () => {
    const seventeenYearsAgo = new Date();
    seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17);
    const value = seventeenYearsAgo.toISOString().slice(0, 10);
    expect(profileBirthDateSchema.safeParse(value).success).toBe(false);
  });

  it('preserves the original "YYYY-MM-DD" string (no timezone conversion)', () => {
    const result = profileBirthDateSchema.safeParse('1990-06-15');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('1990-06-15');
    }
  });
});

describe('firstNameSchema / lastNameSchema', () => {
  it('accepts unicode/accented names', () => {
    expect(firstNameSchema.safeParse('José').success).toBe(true);
    expect(lastNameSchema.safeParse('Núñez').success).toBe(true);
  });

  it('rejects an empty first/last name', () => {
    expect(firstNameSchema.safeParse('   ').success).toBe(false);
    expect(lastNameSchema.safeParse('').success).toBe(false);
  });

  it('rejects a first name over 80 characters and a last name over 120', () => {
    expect(firstNameSchema.safeParse('a'.repeat(81)).success).toBe(false);
    expect(lastNameSchema.safeParse('a'.repeat(121)).success).toBe(false);
  });
});

describe('bioSchema / countryCodeSchema / regionSchema / citySchema', () => {
  it('bio allows up to 160 characters and is optional/nullable', () => {
    expect(bioSchema.safeParse('a'.repeat(160)).success).toBe(true);
    expect(bioSchema.safeParse('a'.repeat(161)).success).toBe(false);
    expect(bioSchema.safeParse(undefined).success).toBe(true);
    expect(bioSchema.safeParse(null).success).toBe(true);
  });

  it('countryCode normalizes to uppercase and requires exactly 2 letters', () => {
    const result = countryCodeSchema.safeParse('br');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('BR');
    }
    expect(countryCodeSchema.safeParse('BRA').success).toBe(false);
  });

  it('region/city are optional and length-capped', () => {
    expect(regionSchema.safeParse('a'.repeat(121)).success).toBe(false);
    expect(citySchema.safeParse('a'.repeat(121)).success).toBe(false);
    expect(regionSchema.safeParse(undefined).success).toBe(true);
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
