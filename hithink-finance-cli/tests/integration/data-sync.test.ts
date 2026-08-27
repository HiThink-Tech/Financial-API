import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import type { DuckDBConnection } from '@duckdb/node-api';
import {
  chooseSyncDecision,
  syncDataFromFuyao,
} from '../../src/application/use-cases/data-sync.js';
import { fetchFuyaoDump } from '../../src/infrastructure/duckdb/dump-client.js';
import { openDatabase } from '../../src/infrastructure/duckdb/connection.js';

function observeCancelledImport(
  connection: DuckDBConnection,
  controller: AbortController,
  qualityChecked: { value: boolean },
): DuckDBConnection {
  let importCompleted = false;
  return new Proxy(connection, {
    get(target, property) {
      if (property === 'run') {
        return async (sql: string, parameters?: Record<string, unknown>) => {
          const result = await target.run(sql, parameters);
          if (sql.includes('UPDATE _import_batches SET completed_at=')) importCompleted = true;
          if (importCompleted && sql === 'COMMIT') controller.abort();
          return result;
        };
      }
      if (property === 'runAndReadAll') {
        return async (sql: string, parameters?: Record<string, unknown>) => {
          if (sql.includes('GROUP BY thscode,date HAVING count(*)>1')) qualityChecked.value = true;
          return target.runAndReadAll(sql, parameters);
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

test('chooses FULL for an empty or long-stale database', () => {
  expect(
    chooseSyncDecision(
      { maxDate: null, releaseId: null },
      { latestDate: '2026-07-08', releaseId: 'r1', lagTradingDays: 0 },
    ),
  ).toBe('FULL');
  expect(
    chooseSyncDecision(
      { maxDate: '2026-01-01', releaseId: 'r0' },
      { latestDate: '2026-07-08', releaseId: 'r1', lagTradingDays: 100 },
    ),
  ).toBe('FULL');
});

test('re-signs once after a transient dump failure and downloads atomically', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-dump-'));
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(new Response('{}', { status: 503 }))
    .mockResolvedValueOnce(
      Response.json({
        code: 0,
        message: 'success',
        data: { presigned_url: 'https://objects.example/releases/r1.parquet?signature=x' },
      }),
    )
    .mockResolvedValueOnce(new Response('parquet-bytes'));
  try {
    const result = await fetchFuyaoDump({
      baseUrl: 'https://fuyao.example',
      apiKey: 'secret',
      kind: 'daily-k',
      cacheDir: root,
      fetch,
      sleep: async () => undefined,
    });
    expect(result.releaseId).toBe('releases/r1.parquet');
    expect(result.sha256).toBe(createHash('sha256').update('parquet-bytes').digest('hex'));
    expect(await readFile(result.path, 'utf8')).toBe('parquet-bytes');
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(String(fetch.mock.calls[1]?.[0])).not.toContain('secret');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('reports byte progress from the streamed dump response', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-dump-progress-'));
  const progress: Array<{ phase: string; downloadedBytes: number; totalBytes?: number }> = [];
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(
      Response.json({
        code: 0,
        message: 'success',
        data: { presigned_url: 'https://objects.example/releases/r2.parquet?signature=x' },
      }),
    )
    .mockResolvedValueOnce(new Response('parquet-bytes', { headers: { 'content-length': '13' } }));
  try {
    await fetchFuyaoDump({
      baseUrl: 'https://fuyao.example',
      apiKey: 'secret',
      kind: 'daily-k',
      cacheDir: root,
      fetch,
      onProgress: (event) => progress.push(event),
    });
    expect(progress).toEqual([
      { kind: 'daily-k', phase: 'started', downloadedBytes: 0, totalBytes: 13 },
      { kind: 'daily-k', phase: 'progress', downloadedBytes: 13, totalBytes: 13 },
      { kind: 'daily-k', phase: 'completed', downloadedBytes: 13, totalBytes: 13 },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('chooses SKIP for an unchanged current release and INCREMENTAL for a short lag', () => {
  expect(
    chooseSyncDecision(
      { maxDate: '2026-07-08', releaseId: 'r1' },
      { latestDate: '2026-07-08', releaseId: 'r1', lagTradingDays: 0 },
    ),
  ).toBe('SKIP');
  expect(
    chooseSyncDecision(
      { maxDate: '2026-07-07', releaseId: 'r1' },
      { latestDate: '2026-07-08', releaseId: 'r2', lagTradingDays: 1 },
    ),
  ).toBe('INCREMENTAL');
});

test('finishes factors, release metadata, and quality checks before reporting late cancellation', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-sync-cancel-'));
  const fixture = await openDatabase(path.join(root, 'fixture.duckdb'));
  const target = await openDatabase(path.join(root, 'target.duckdb'));
  const klinePath = path.join(root, 'daily-k-source.parquet');
  const eventsPath = path.join(root, 'adjustment-source.parquet');
  const controller = new AbortController();
  const qualityChecked = { value: false };
  try {
    await fixture.connection.run(
      `COPY (SELECT * FROM (VALUES ('000001.SZ', DATE '2025-01-02', 10.0, 10.5, 9.5, 10.0, NULL::DOUBLE, 100.0, 1000.0), ('000001.SZ', DATE '2025-01-03', 9.5, 10.0, 9.0, 9.5, 10.0, 120.0, 1140.0)) AS t(thscode,date,open,high,low,"close",prev_close,volume,amount)) TO '${klinePath.replaceAll("'", "''")}' (FORMAT PARQUET)`,
    );
    await fixture.connection.run(
      `COPY (SELECT '000001.SZ'::VARCHAR thscode, DATE '2025-01-03' ex_date, 0.5 dividend_per_share, 0.0 per_share_bonus, 0.0 rights_ratio, NULL::DOUBLE rights_price) TO '${eventsPath.replaceAll("'", "''")}' (FORMAT PARQUET)`,
    );
    const klineBytes = await readFile(klinePath);
    const eventBytes = await readFile(eventsPath);
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
      const url = String(input);
      if (url.includes('/daily-k/download-url')) {
        return Response.json({
          code: 0,
          data: { presigned_url: 'https://objects.example/releases/kline-r2/parquet' },
        });
      }
      if (url.includes('/adjustment-factors/download-url')) {
        return Response.json({
          code: 0,
          data: { presigned_url: 'https://objects.example/releases/events-r2/parquet' },
        });
      }
      return new Response(url.includes('kline-r2') ? klineBytes : eventBytes);
    });
    vi.stubGlobal('fetch', fetch);

    await expect(
      syncDataFromFuyao(observeCancelledImport(target.connection, controller, qualityChecked), {
        baseUrl: 'https://fuyao.example',
        apiKey: 'test-key',
        cacheDir: path.join(root, 'cache'),
        now: new Date('2025-01-04T00:00:00Z'),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: 'CLI_CANCELLED' });

    const state = await target.connection.runAndReadAll(
      "SELECT (SELECT count(*) FROM raw_kline_daily), (SELECT count(*) FROM calc_adjust_factor_daily), (SELECT value FROM _meta WHERE key='last_kline_release_id')",
    );
    expect(state.getRowsJson()[0]).toEqual(['2', '2', 'kline-r2/parquet']);
    expect(qualityChecked.value).toBe(true);
  } finally {
    vi.unstubAllGlobals();
    fixture.close();
    target.close();
    await rm(root, { recursive: true, force: true });
  }
});
