import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { openDatabase } from '../../src/infrastructure/duckdb/connection.js';
import { initializeData } from '../../src/application/use-cases/data-init.js';

test('imports a three-file Parquet bundle transactionally', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-init-'));
  const fixture = await openDatabase(path.join(root, 'fixture.duckdb'));
  const target = await openDatabase(path.join(root, 'target.duckdb'));
  const klinePath = path.join(root, 'kline.parquet');
  const eventsPath = path.join(root, 'events.parquet');
  const symbolsPath = path.join(root, 'symbols.parquet');
  try {
    await fixture.connection.run(
      `COPY (SELECT '000001.SZ'::VARCHAR thscode, DATE '2025-01-02' date, 10.0 open, 10.5 high, 9.5 low, 10.0 AS "close", NULL::DOUBLE prev_close, 100.0 volume, 1000.0 amount) TO '${klinePath.replaceAll("'", "''")}' (FORMAT PARQUET)`,
    );
    await fixture.connection.run(
      `COPY (SELECT '000001.SZ'::VARCHAR thscode, DATE '2025-01-03' ex_date, 0.5 dividend_per_share, 0.0 per_share_bonus, 0.0 rights_ratio, NULL::DOUBLE rights_price) TO '${eventsPath.replaceAll("'", "''")}' (FORMAT PARQUET)`,
    );
    await fixture.connection.run(
      `COPY (SELECT '000001.SZ'::VARCHAR AS thscode, '000001' AS ticker, '平安银行' AS "name", 'SZ' AS exchange, 'a-share' AS asset_type, CURRENT_TIMESTAMP AS updated_at) TO '${symbolsPath.replaceAll("'", "''")}' (FORMAT PARQUET)`,
    );
    await initializeData(target.connection, {
      klinePath,
      eventsPath,
      symbolsPath,
      batchId: 'batch-1',
      source: 'fixture',
    });
    const reader = await target.connection.runAndReadAll('SELECT count(*) FROM raw_kline_daily');
    expect(Number(reader.getRowsJson()[0]?.[0])).toBe(1);
  } finally {
    fixture.close();
    target.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('imports the published Fuyao dump schemas and derives symbols', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-published-dump-'));
  const fixture = await openDatabase(path.join(root, 'fixture.duckdb'));
  const target = await openDatabase(path.join(root, 'target.duckdb'));
  const klinePath = path.join(root, 'daily-k.parquet');
  const eventsPath = path.join(root, 'adjustment-factors.parquet');
  try {
    await fixture.connection.run(
      `COPY (SELECT '000001.SZ'::VARCHAR thscode, 'CNY' currency, '1d' AS "interval", 'none' adjusted, 1735747200000::BIGINT date_ms, 10.0 open_price, 10.5 high_price, 9.5 low_price, 10.0 close_price, 100.0 volume, 1000.0 turnover) TO '${klinePath.replaceAll("'", "''")}' (FORMAT PARQUET)`,
    );
    await fixture.connection.run(
      `COPY (SELECT '000001.SZ'::VARCHAR thscode, '000001' ticker, 1735833600000::BIGINT ex_date_ms, 0.5 dividend_per_share, 0.0 per_share_bonus, 0.0 allotment_ratio, NULL::DOUBLE allotment_price, 'CNY' currency) TO '${eventsPath.replaceAll("'", "''")}' (FORMAT PARQUET)`,
    );
    await initializeData(target.connection, {
      klinePath,
      eventsPath,
      batchId: 'published-1',
      source: 'fuyao-dump',
    });
    const bars = await target.connection.runAndReadAll(
      'SELECT date::VARCHAR,amount FROM raw_kline_daily',
    );
    expect(bars.getRowsJson()[0]).toEqual(['2025-01-02', 1000]);
    const symbols = await target.connection.runAndReadAll(
      "SELECT ticker,exchange FROM dim_symbol WHERE thscode='000001.SZ'",
    );
    expect(symbols.getRowsJson()[0]).toEqual(['000001', 'SZ']);
  } finally {
    fixture.close();
    target.close();
    await rm(root, { recursive: true, force: true });
  }
});
