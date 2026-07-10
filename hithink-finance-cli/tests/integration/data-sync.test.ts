import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { chooseSyncDecision } from '../../src/application/use-cases/data-sync.js';
import { fetchFuyaoDump } from '../../src/infrastructure/duckdb/dump-client.js';

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
    expect(await readFile(result.path, 'utf8')).toBe('parquet-bytes');
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(String(fetch.mock.calls[1]?.[0])).not.toContain('secret');
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
