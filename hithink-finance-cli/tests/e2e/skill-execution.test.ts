import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';
import { remoteCapabilities } from '../../src/contracts/remote-capabilities.js';
import { openDatabase } from '../../src/infrastructure/duckdb/connection.js';
import { applyMigrations } from '../../src/infrastructure/duckdb/migrations.js';

const commands = [
  {
    command: ['index', 'snapshot'],
    code: '000300.SH',
    endpoint: '/api/a-share-index/prices/snapshot',
  },
  {
    command: ['market', 'auction-snapshot'],
    code: '600519.SH',
    endpoint: '/api/a-share/auction/snapshot',
  },
  {
    command: ['special', 'anomaly-stock'],
    code: '600519.SH',
    endpoint: '/api/a-share/special-data/anomaly-analysis-stock',
  },
];

test.each(commands)('$command accepts file and stdin as the only code source', async (value) => {
  const root = await mkdtemp(path.join(tmpdir(), 'skill-code-input-'));
  const requests: URL[] = [];
  const server = createServer((request, response) => {
    requests.push(new URL(request.url ?? '/', 'http://fixture'));
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 0, message: 'ok', data: { timestamp: 1, item: [] } }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('fixture unavailable');
    const codesFile = path.join(root, 'codes.txt');
    await writeFile(codesFile, `${value.code}\n`);
    const env = {
      HITHINK_FINANCE_NO_UPDATE_CHECK: '1',
      HITHINK_FINANCE_API_KEY: randomUUID(),
      HITHINK_FINANCE_FUYAO_BASE_URL: `http://127.0.0.1:${address.port}`,
    };
    for (const inputMode of ['file', 'stdin']) {
      const output = path.join(root, `${inputMode}.json`);
      const result = await execa(
        'node',
        [
          'dist/cli/main.js',
          ...value.command,
          ...(inputMode === 'file' ? ['--codes-file', codesFile] : ['--codes-stdin']),
          '--output',
          output,
          '--format',
          'json',
        ],
        { env, ...(inputMode === 'stdin' ? { input: `${value.code}\n` } : {}) },
      );
      expect(JSON.parse(result.stdout).ok).toBe(true);
      expect(JSON.parse(await readFile(output, 'utf8')).ok).toBe(true);
    }
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.pathname).toBe(value.endpoint);
      expect(request.searchParams.get('thscodes')).toBe(value.code);
    }
    const missing = await execa(
      'node',
      ['dist/cli/main.js', ...value.command, '--format', 'json'],
      { env, reject: false },
    );
    expect(missing.exitCode).toBe(2);
    expect(requests).toHaveLength(2);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});

test('the generated fund example satisfies the current nested input contract', async () => {
  const text = await readFile(
    'skills/hithink-finance-fund/references/fund-indicators-line.md',
    'utf8',
  );
  const indexes = text.match(/--indexes '([^']+)'/u)?.[1];
  const timeRange = text.match(/--time-range '([^']+)'/u)?.[1];
  const capability = remoteCapabilities.find((item) => item.id === 'fund.indicators-line')!;
  expect(capability.inputSchema.safeParse({ indexes, timeRange }).success).toBe(true);
  const invalid = capability.inputSchema.safeParse({
    indexes: '[{"thscodes":["000001.OF"]}]',
    timeRange: '{}',
  });
  expect(invalid.success).toBe(false);
  if (!invalid.success) {
    const messages = invalid.error.issues.map((issue) => issue.message).join(';');
    expect(messages).toContain('index_info');
    expect(messages).toContain('time_type');
  }
});

test('research preflight distinguishes pending migrations and failed data quality', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'skill-research-'));
  const file = path.join(root, 'research.duckdb');
  const env = {
    HITHINK_FINANCE_NO_UPDATE_CHECK: '1',
    APPDATA: path.join(root, 'config'),
    LOCALAPPDATA: path.join(root, 'state'),
    XDG_CONFIG_HOME: path.join(root, 'config'),
    XDG_STATE_HOME: path.join(root, 'state'),
  };
  const run = async (...args: string[]) => {
    const result = await execa(
      'node',
      ['dist/cli/main.js', ...args, '--db', file, '--format', 'json'],
      { env },
    );
    return JSON.parse(result.stdout);
  };
  try {
    // An existing uninitialized database must stop at the migration plan.
    const empty = await openDatabase(file);
    empty.close();
    const before = await readFile(file);
    const status = await run('data', 'status');
    const pending = await run('data', 'migrate');
    expect(status.data.version).toBe(0);
    expect(pending.data.applied).toBe(false);
    expect(pending.data.versions).not.toEqual([]);
    expect(await readFile(file)).toEqual(before);

    const db = await openDatabase(file);
    try {
      await applyMigrations(db.connection);
      await db.connection.run(
        "INSERT INTO raw_kline_daily(thscode,date,open,high,low,close,volume,amount) VALUES ('600000.SH',DATE '2026-01-05',10,5,8,9,-1,100)",
      );
    } finally {
      db.close();
    }
    const initialized = await readFile(file);
    expect((await run('data', 'migrate')).data.versions).toEqual([]);
    const quality = await run('data', 'validate');
    expect(quality.ok).toBe(true);
    expect(quality.data.ok).toBe(false);
    expect(quality.data.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'QUALITY_NEGATIVE_VOLUME', count: 1 }),
      ]),
    );
    expect(await readFile(file)).toEqual(initialized);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
