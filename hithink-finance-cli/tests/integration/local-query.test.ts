import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { openDatabase } from '../../src/infrastructure/duckdb/connection.js';
import { applyMigrations } from '../../src/infrastructure/duckdb/migrations.js';
import { exportQuery, queryReadOnly } from '../../src/application/use-cases/local-query.js';

test('accepts one SELECT/CTE and rejects write, extension, external and multi statements', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-query-'));
  const database = await openDatabase(path.join(root, 'market.duckdb'));
  try {
    await applyMigrations(database.connection);
    await expect(
      queryReadOnly(database.connection, 'WITH x AS (SELECT 1 AS n) SELECT * FROM x'),
    ).resolves.toEqual([{ n: 1 }]);
    for (const sql of [
      "INSERT INTO dim_symbol(thscode) VALUES ('x')",
      "COPY (SELECT 1) TO 'outside.csv'",
      "ATTACH 'other.db' AS other",
      'INSTALL httpfs',
      'LOAD httpfs',
      'SELECT 1; SELECT 2',
    ]) {
      await expect(queryReadOnly(database.connection, sql)).rejects.toMatchObject({
        code: 'DB_READ_ONLY_VIOLATION',
      });
    }
  } finally {
    database.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('streams an atomic NDJSON export without allowing write SQL', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-export-'));
  const database = await openDatabase(path.join(root, 'market.duckdb'));
  const output = path.join(root, 'out', 'rows.ndjson');
  try {
    expect(
      await exportQuery(database.connection, 'SELECT * FROM range(3) t(n)', output, 'ndjson'),
    ).toBe(3);
    expect((await readFile(output, 'utf8')).trim().split('\n')).toHaveLength(3);
    await expect(
      exportQuery(database.connection, 'DELETE FROM range(3)', output, 'ndjson'),
    ).rejects.toMatchObject({ code: 'DB_READ_ONLY_VIOLATION' });
  } finally {
    database.close();
    await rm(root, { recursive: true, force: true });
  }
});
