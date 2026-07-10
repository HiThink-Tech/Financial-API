import { execa } from 'execa';
import { expect, test } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('maps invalid local export format to a validation envelope', async () => {
  const result = await execa(
    'node',
    [
      'dist/cli/main.js',
      'db',
      'export',
      '--sql',
      'SELECT 1',
      '--output',
      'out.ndjson',
      '--file-format',
      'xml',
      '--format',
      'json',
    ],
    { reject: false },
  );

  expect(result.exitCode).toBe(2);
  expect(JSON.parse(result.stderr)).toMatchObject({
    error: {
      code: 'CLI_BAD_ARGUMENT',
      category: 'validation',
      message: '--file-format must be ndjson, csv, or parquet',
    },
  });
});

test('maps invalid local market date to a validation envelope', async () => {
  const result = await execa(
    'node',
    [
      'dist/cli/main.js',
      'market',
      'panel',
      '--start',
      '20260709',
      '--end',
      '2026-07-09',
      '--output',
      'panel.parquet',
      '--format',
      'json',
    ],
    { reject: false },
  );

  expect(result.exitCode).toBe(2);
  expect(JSON.parse(result.stderr)).toMatchObject({
    error: {
      code: 'CLI_BAD_ARGUMENT',
      category: 'validation',
      message: 'dates must use YYYY-MM-DD',
    },
  });
});

test('maps incomplete local data init bundle to a validation envelope', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-data-init-'));
  const result = await execa(
    'node',
    [
      'dist/cli/main.js',
      '--db',
      path.join(root, 'market.duckdb'),
      '--format',
      'json',
      'data',
      'init',
      '--kline',
      path.join(root, 'kline.parquet'),
    ],
    { reject: false },
  );

  expect(result.exitCode).toBe(2);
  expect(JSON.parse(result.stderr)).toMatchObject({
    error: {
      code: 'CLI_BAD_ARGUMENT',
      category: 'validation',
      message: '--kline and --events must be provided together.',
    },
  });
});
