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
  it.each(['dario', 'dario_123', 'dario.dev', 'abc'])('accepts %s', (username) => {
    expect(isValidUsername(username)).toBe(true);
  });

  it.each(['ab', 'a'.repeat(31), 'dario!', 'da rio', ''])('rejects %s', (username) => {
    expect(isValidUsername(username)).toBe(false);
  });
});
