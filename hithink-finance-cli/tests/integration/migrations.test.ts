import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { openDatabase } from '../../src/infrastructure/duckdb/connection.js';
import {
  applyMigrations,
  assertSchemaCompatibility,
  planMigrations,
  type Migration,
} from '../../src/infrastructure/duckdb/migrations.js';

const roots: string[] = [];

async function databasePath(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-duckdb-'));
  roots.push(root);
  return path.join(root, 'market.duckdb');
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('plans and applies the safe v1 migration', async () => {
  const database = await openDatabase(await databasePath());
  try {
    expect(
      (await planMigrations(database.connection)).map((migration) => migration.version),
    ).toEqual([1]);
    await applyMigrations(database.connection);
    await expect(assertSchemaCompatibility(database.connection)).resolves.toEqual({ version: 1 });
  } finally {
    database.close();
  }
});

test('rolls back a failing migration and preserves the original schema version', async () => {
  const database = await openDatabase(await databasePath());
  try {
    await applyMigrations(database.connection);
    const broken: Migration = {
      version: 2,
      name: 'broken',
      type: 'safe',
      checksum: 'test-only',
      sql: 'CREATE TABLE should_rollback(id INTEGER); SELECT missing_column FROM missing_table;',
    };
    await expect(applyMigrations(database.connection, [broken])).rejects.toThrow();
    await expect(assertSchemaCompatibility(database.connection)).resolves.toEqual({ version: 1 });
    const reader = await database.connection.runAndReadAll(
      "SELECT count(*) AS count FROM information_schema.tables WHERE table_name='should_rollback'",
    );
    expect(Number(reader.getRowsJson()[0]?.[0])).toBe(0);
  } finally {
    database.close();
  }
});

test('requires explicit apply for heavy migrations', async () => {
  const database = await openDatabase(await databasePath());
  try {
    await applyMigrations(database.connection);
    const heavy: Migration = {
      version: 2,
      name: 'heavy',
      type: 'heavy',
      checksum: 'test-only',
      sql: 'CREATE TABLE heavy_table(id INTEGER);',
    };
    await expect(applyMigrations(database.connection, [heavy])).rejects.toMatchObject({
      code: 'DATA_MIGRATION_CONFIRMATION_REQUIRED',
    });
    await applyMigrations(database.connection, [heavy], { allowHeavy: true });
    await expect(assertSchemaCompatibility(database.connection, 2)).resolves.toEqual({
      version: 2,
    });
  } finally {
    database.close();
  }
});
