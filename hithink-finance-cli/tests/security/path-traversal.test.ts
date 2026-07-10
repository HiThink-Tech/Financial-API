import { expect, test } from 'vitest';
import { cleanManagedCache } from '../../src/application/use-cases/data-clean.js';
import { removeDatabase } from '../../src/application/use-cases/data-remove.js';

test('rejects cleanup outside the managed root', async () => {
  await expect(cleanManagedCache('../outside', './managed')).rejects.toMatchObject({
    code: 'PATH_OUTSIDE_MANAGED_ROOT',
    category: 'validation',
    exitCode: 2,
  });
});

test('rejects database removal unless the exact path is confirmed', async () => {
  await expect(
    removeDatabase('./managed/db.duckdb', './managed/other.duckdb', true),
  ).rejects.toMatchObject({
    code: 'PATH_NOT_CONFIRMED',
    category: 'validation',
    exitCode: 2,
  });
});

test('rejects database removal without explicit confirmation', async () => {
  await expect(
    removeDatabase('./managed/db.duckdb', './managed/db.duckdb', false),
  ).rejects.toMatchObject({
    code: 'CONFIRMATION_REQUIRED',
    category: 'validation',
    exitCode: 2,
  });
});
