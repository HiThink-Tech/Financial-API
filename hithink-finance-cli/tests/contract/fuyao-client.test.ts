import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { FuyaoClient } from '../../src/infrastructure/fuyao/client.js';
import { paginate } from '../../src/infrastructure/fuyao/pagination.js';
import { TEN_YEARS_MS, sliceTimeWindow } from '../../src/infrastructure/fuyao/windowing.js';

const servers: Server[] = [];

async function fixtureServer(
  handler: Parameters<typeof createServer>[0],
): Promise<{ baseUrl: string; server: Server }> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('fixture server unavailable');
  return { baseUrl: `http://127.0.0.1:${address.port}`, server };
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

describe('Fuyao HTTP client', () => {
  test('validates a successful response and sends the API key header', async () => {
    const { baseUrl } = await fixtureServer((request, response) => {
      expect(request.headers['x-api-key']).toBe('test-key');
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ code: 0, message: 'ok', request_id: 'req_1', data: { n: 1 } }));
    });
    const client = new FuyaoClient({
      baseUrl,
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
    });

    await expect(
      client.request({ path: '/success', schema: z.object({ n: z.number() }) }),
    ).resolves.toEqual({ data: { n: 1 }, requestId: 'req_1' });
  });

  test('retries retryable business errors three total attempts and honors Retry-After', async () => {
    let attempts = 0;
    const delays: number[] = [];
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => {
      attempts += 1;
      return new Response(
        JSON.stringify(
          attempts < 3
            ? { code: 4001, message: 'limited', request_id: `req_${attempts}`, data: null }
            : { code: 0, message: 'ok', request_id: 'req_3', data: { done: true } },
        ),
        { headers: { 'content-type': 'application/json', 'retry-after': '0' } },
      );
    });
    const client = new FuyaoClient({
      baseUrl: 'https://fixture.invalid',
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
      fetch,
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
      random: () => 0,
    });

    await expect(
      client.request({ path: '/retry', schema: z.object({ done: z.boolean() }) }),
    ).resolves.toMatchObject({ data: { done: true }, requestId: 'req_3' });
    expect(attempts).toBe(3);
    expect(delays).toEqual([0, 0]);
  });

  test('retries network timeouts then returns a trackable upstream failure', async () => {
    const { baseUrl } = await fixtureServer((_request, response) => {
      setTimeout(() => response.end('{}'), 100);
    });
    const client = new FuyaoClient({
      baseUrl,
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
      timeoutMs: 10,
      sleep: async () => undefined,
    });

    await expect(client.request({ path: '/timeout', schema: z.unknown() })).rejects.toMatchObject({
      code: 'UPSTREAM_NETWORK_FAILURE',
      category: 'upstream',
      exitCode: 4,
      retryable: true,
    });
  });
});

describe('bounded helpers', () => {
  test('requires an explicit pagination bound unless output is streamed', async () => {
    await expect(paginate(async () => ({ items: [1], hasMore: false }), {})).rejects.toMatchObject({
      code: 'CLI_PAGINATION_BOUND_REQUIRED',
    });
  });

  test('stops pagination at the row bound', async () => {
    const result = await paginate(
      async (page) => ({ items: [page * 2, page * 2 + 1], hasMore: true }),
      { maxRows: 3 },
    );
    expect(result).toEqual({ items: [0, 1, 2], truncated: true, pages: 2 });
  });

  test('slices windows longer than ten years without overlap', () => {
    const slices = sliceTimeWindow(0, TEN_YEARS_MS + 10);
    expect(slices).toEqual([
      { start: 0, end: TEN_YEARS_MS },
      { start: TEN_YEARS_MS + 1, end: TEN_YEARS_MS + 10 },
    ]);
  });
});
