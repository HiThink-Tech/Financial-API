import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { openDatabase } from '../../src/infrastructure/duckdb/connection.js';
import { applyMigrations } from '../../src/infrastructure/duckdb/migrations.js';
import { validateDatabase } from '../../src/infrastructure/duckdb/quality.js';

test('reports invalid OHLC, negative volume and incomplete batches as structured issues', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-quality-'));
  const database = await openDatabase(path.join(root, 'market.duckdb'));
  try {
    await applyMigrations(database.connection);
    await database.connection.run(`
      INSERT INTO raw_kline_daily VALUES ('000001.SZ','2025-01-02',10,9,11,10,NULL,-1,-2,NULL);
      INSERT INTO _import_batches(batch_id,source,started_at,status) VALUES ('b1','test',CURRENT_TIMESTAMP,'running');
    `);
    const result = await validateDatabase(database.connection);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'QUALITY_INVALID_OHLC',
        'QUALITY_NEGATIVE_VOLUME',
        'QUALITY_INCOMPLETE_BATCH',
      ]),
    );
  } finally {
    database.close();
    await rm(root, { recursive: true, force: true });
  }
});
