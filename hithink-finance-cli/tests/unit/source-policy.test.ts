import { expect, test } from 'vitest';
import { chooseSource } from '../../src/application/source-policy.js';

test('routes remote-only and local-only domains deterministically', () => {
  expect(
    chooseSource({ kind: 'snapshot', requested: 'auto' }, { exists: true, coversWindow: true }),
  ).toBe('remote');
  expect(
    chooseSource({ kind: 'panel', requested: 'auto' }, { exists: true, coversWindow: true }),
  ).toBe('local');
});

test('routes single history locally only when covered and refuses missing local bulk history', () => {
  expect(
    chooseSource(
      { kind: 'history', requested: 'auto', symbolCount: 1 },
      { exists: true, coversWindow: true },
    ),
  ).toBe('local');
  expect(
    chooseSource(
      { kind: 'history', requested: 'auto', symbolCount: 1 },
      { exists: false, coversWindow: false },
    ),
  ).toBe('remote');
  expect(() =>
    chooseSource(
      { kind: 'history', requested: 'auto', symbolCount: 20 },
      { exists: false, coversWindow: false },
    ),
  ).toThrowError(/DATA_INITIALIZATION_REQUIRED/);
});

test('rejects unsupported explicit source combinations', () => {
  expect(() =>
    chooseSource({ kind: 'snapshot', requested: 'local' }, { exists: true, coversWindow: true }),
  ).toThrowError(/SOURCE_NOT_SUPPORTED/);
  expect(() =>
    chooseSource({ kind: 'panel', requested: 'remote' }, { exists: true, coversWindow: true }),
  ).toThrowError(/SOURCE_NOT_SUPPORTED/);
});
