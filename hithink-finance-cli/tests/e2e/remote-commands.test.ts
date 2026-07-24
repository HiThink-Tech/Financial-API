import { createServer } from 'node:http';
import { execa } from 'execa';
import { expect, test } from 'vitest';
import { remoteCapabilities } from '../../src/contracts/remote-capabilities.js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('every remote command exposes help without making a network request', async () => {
  for (const capability of remoteCapabilities) {
    const result = await execa('node', [
      'dist/cli/main.js',
      ...capability.command,
      '--help',
      '--lang',
      'en',
    ]);
    expect(result.stdout).toContain(`Usage: hithink-finance ${capability.command.join(' ')}`);
  }
}, 60_000);

test('executes a descriptor-backed command against a bounded local fixture', async () => {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fixture');
    expect(url.pathname).toBe('/api/meta/tickers/search');
    expect(url.searchParams.get('q')).toBe('贵州茅台');
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        code: 0,
        message: 'ok',
        request_id: 'req_fixture',
        data: { timestamp: 1, item: [{ thscode: '600519.SH', name: '贵州茅台' }] },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('fixture unavailable');
    const result = await execa(
      'node',
      ['dist/cli/main.js', 'symbol', 'search', '--q', '贵州茅台', '--format', 'json'],
      {
        env: {
          HITHINK_FINANCE_API_KEY: 'fixture-key',
          HITHINK_FINANCE_FUYAO_BASE_URL: `http://127.0.0.1:${address.port}`,
        },
      },
    );
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      command: 'symbol.search',
      meta: { source: 'remote', request_id: 'req_fixture' },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('maps fund command options to the published query contract', async () => {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fixture');
    expect(url.pathname).toBe('/api/fund/performance/nav');
    expect(url.searchParams.get('fund_type')).toBe('otc');
    expect(url.searchParams.get('thscode')).toBe('025480.OF');
    expect(url.searchParams.get('range')).toBe('year');
    expect(url.searchParams.get('nav_type')).toBe('unit,adj');
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        code: 0,
        message: 'ok',
        request_id: 'req_fund_fixture',
        data: { item: [{ nav_date: 1784217600000, unit_nav: 1.2345 }] },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('fixture unavailable');
    const result = await execa(
      'node',
      [
        'dist/cli/main.js',
        'fund',
        'nav',
        '--fund-type',
        'otc',
        '--thscode',
        '025480.OF',
        '--range',
        'year',
        '--format',
        'json',
      ],
      {
        env: {
          HITHINK_FINANCE_API_KEY: 'fixture-key',
          HITHINK_FINANCE_FUYAO_BASE_URL: `http://127.0.0.1:${address.port}`,
        },
      },
    );
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      command: 'fund.nav',
      meta: { source: 'remote', request_id: 'req_fund_fixture', count: 1 },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('normalizes and deduplicates valuation codes before the HTTP request', async () => {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fixture');
    expect(url.pathname).toBe('/api/a-share/valuations/snapshot');
    expect(url.searchParams.get('thscodes')).toBe('600519.SH,000001.SZ');
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        code: 0,
        message: 'ok',
        request_id: 'req_valuation_fixture',
        data: { timestamp: 1, total: 0, item: [] },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('fixture unavailable');
    const result = await execa(
      'node',
      [
        'dist/cli/main.js',
        'valuation',
        'snapshot',
        '--thscodes',
        ' 600519.sh,000001.SZ,600519.SH ',
        '--format',
        'json',
      ],
      {
        env: {
          HITHINK_FINANCE_API_KEY: 'fixture-key',
          HITHINK_FINANCE_FUYAO_BASE_URL: `http://127.0.0.1:${address.port}`,
        },
      },
    );
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      command: 'valuation.snapshot',
      meta: { source: 'remote', request_id: 'req_valuation_fixture' },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('rejects valuation raw token overflow before making an HTTP request', async () => {
  const repeated = Array.from({ length: 101 }, () => '600519.SH').join(',');
  const result = await execa(
    'node',
    ['dist/cli/main.js', 'valuation', 'snapshot', '--thscodes', repeated, '--format', 'json'],
    {
      env: {
        HITHINK_FINANCE_API_KEY: 'fixture-key',
        HITHINK_FINANCE_FUYAO_BASE_URL: 'http://127.0.0.1:1',
      },
      reject: false,
    },
  );

  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe('');
  expect(JSON.parse(result.stderr)).toMatchObject({
    ok: false,
    command: 'valuation',
    error: { code: 'CLI_BAD_ARGUMENT' },
  });
  expect(result.stderr).toContain('at most 100 raw tokens');
});

test('writes remote command output to a file and keeps stdout bounded', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-remote-output-'));
  const output = path.join(root, 'symbol-search.json');
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fixture');
    expect(url.pathname).toBe('/api/meta/tickers/search');
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        code: 0,
        message: 'ok',
        request_id: 'req_output_fixture',
        data: { item: [{ thscode: '600519.SH', name: '贵州茅台' }] },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('fixture unavailable');
    const result = await execa(
      'node',
      [
        'dist/cli/main.js',
        'symbol',
        'search',
        '--q',
        '600519',
        '--output',
        output,
        '--format',
        'json',
      ],
      {
        env: {
          HITHINK_FINANCE_API_KEY: 'fixture-key',
          HITHINK_FINANCE_FUYAO_BASE_URL: `http://127.0.0.1:${address.port}`,
        },
      },
    );
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      data: { path: output, format: 'json', count: 1 },
      meta: { count: 1 },
    });
    expect(JSON.parse(await readFile(output, 'utf8'))).toMatchObject({
      ok: true,
      data: { item: [{ thscode: '600519.SH' }] },
      meta: { source: 'remote', request_id: 'req_output_fixture', count: 1 },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});

test('merges repeated and file-based batch codes without duplicates', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-codes-'));
  const codes = path.join(root, 'codes.txt');
  await writeFile(codes, '000001.SZ\n600519.SH\n');
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://fixture');
    expect(url.pathname).toBe('/api/a-share/prices/snapshot');
    expect(url.searchParams.get('thscodes')).toBe('600519.SH,000001.SZ');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 0, message: 'ok', data: { item: [] } }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('fixture unavailable');
    await execa(
      'node',
      [
        'dist/cli/main.js',
        'market',
        'snapshot',
        '--thscodes',
        '600519.SH',
        '--codes-file',
        codes,
        '--format',
        'json',
      ],
      {
        env: {
          HITHINK_FINANCE_API_KEY: 'fixture-key',
          HITHINK_FINANCE_FUYAO_BASE_URL: `http://127.0.0.1:${address.port}`,
        },
      },
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
