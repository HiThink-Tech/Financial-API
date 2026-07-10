import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { openDatabase } from '../../src/infrastructure/duckdb/connection.js';
import { applyMigrations } from '../../src/infrastructure/duckdb/migrations.js';
import { CORE_TABLES, STABLE_VIEWS } from '../../src/infrastructure/duckdb/schema.js';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('creates core tables and stable consumer views', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-schema-'));
  roots.push(root);
  const database = await openDatabase(path.join(root, 'market.duckdb'));
  try {
    await applyMigrations(database.connection);
    const reader = await database.connection.runAndReadAll(
      "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema='main' ORDER BY table_name",
    );
    const names = reader.getRowObjectsJson().map((row) => String(row.table_name));
    for (const name of [...CORE_TABLES, ...STABLE_VIEWS]) expect(names).toContain(name);
  } finally {
    database.close();
  }
});
