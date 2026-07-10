import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { openDatabase } from '../../src/infrastructure/duckdb/connection.js';
import { rebuildAdjustmentFactors } from '../../src/infrastructure/duckdb/factors.js';
import { applyMigrations } from '../../src/infrastructure/duckdb/migrations.js';

test('rebuilds forward and backward factors for a cash dividend', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-factors-'));
  const database = await openDatabase(path.join(root, 'market.duckdb'));
  try {
    await applyMigrations(database.connection);
    await database.connection.run(`
      INSERT INTO raw_kline_daily VALUES
      ('000001.SZ','2025-01-02',10,10.6,9.8,10,NULL,100,1000,NULL),
      ('000001.SZ','2025-01-03',9.5,9.8,9,9.5,10,100,1000,NULL),
      ('000001.SZ','2025-01-06',9.6,9.9,9.4,9.7,9.5,100,1000,NULL);
      INSERT INTO raw_adjustment_events(thscode,ex_date,dividend_per_share)
      VALUES ('000001.SZ','2025-01-03',0.5);
    `);
    expect(await rebuildAdjustmentFactors(database.connection)).toBe(3);
    const reader = await database.connection.runAndReadAll(
      "SELECT forward_factor, backward_factor FROM calc_adjust_factor_daily WHERE thscode='000001.SZ' ORDER BY date",
    );
    const rows = reader.getRowsJson().map((row) => row.map(Number));
    expect(rows[0]?.[0]).toBeCloseTo(0.95);
    expect(rows[0]?.[1]).toBeCloseTo(1);
    expect(rows[2]?.[0]).toBeCloseTo(1);
    expect(rows[2]?.[1]).toBeCloseTo(10 / 9.5);
  } finally {
    database.close();
    await rm(root, { recursive: true, force: true });
  }
});
