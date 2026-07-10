import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { expect, test } from 'vitest';
import { openDatabase } from '../../src/infrastructure/duckdb/connection.js';
import { applyMigrations } from '../../src/infrastructure/duckdb/migrations.js';
import { queryReadOnly } from '../../src/application/use-cases/local-query.js';

test('bounded local query stays within a conservative baseline', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-perf-'));
  const database = await openDatabase(path.join(root, 'db.duckdb'));
  try {
    await applyMigrations(database.connection);
    const start = performance.now();
    await queryReadOnly(database.connection, 'SELECT * FROM v_daily LIMIT 100');
    expect(performance.now() - start).toBeLessThan(2_000);
  } finally {
    database.close();
    await rm(root, { recursive: true, force: true });
  }
});
