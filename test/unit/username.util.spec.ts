import { describe, expect, it } from 'vitest';
import { isValidUsername, normalizeUsername } from '../../src/common/utils/username.util';

describe('normalizeUsername', () => {
  it('lowercases and trims so "Dario", "dario" and "DARIO" all normalize the same', () => {
    expect(normalizeUsername('Dario')).toBe('dario');
    expect(normalizeUsername('DARIO')).toBe('dario');
    expect(normalizeUsername('  dario  ')).toBe('dario');
  });
});

describe('isValidUsername', () => {
  it.each([
    'dario',
    'dario_123',
    'dario.dev',
    'abc',
    'darioreis',
    'dario_reis',
    'dario.reis',
    'dario123',
  ])('accepts %s', (username) => {
    expect(isValidUsername(username)).toBe(true);
  });

  it.each(['ab', 'a'.repeat(31), 'dario!', 'da rio', '', 'da', '_dario', '@dario', 'dario reis'])(
    'rejects %s',
    (username) => {
      expect(isValidUsername(username)).toBe(false);
    },
  );

  it('rejects a username starting with a digit (must start with a letter)', () => {
    expect(isValidUsername('1dario')).toBe(false);
  });

  it('rejects uppercase input - callers must normalize first', () => {
    expect(isValidUsername('Dario')).toBe(false);
  });

  it('validates case-insensitively once normalized', () => {
    expect(isValidUsername(normalizeUsername('Dario'))).toBe(true);
    expect(isValidUsername(normalizeUsername('DARIO'))).toBe(true);
    expect(isValidUsername(normalizeUsername('dario'))).toBe(true);
  });
});
