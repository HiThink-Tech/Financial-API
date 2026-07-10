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
}, 30_000);

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
