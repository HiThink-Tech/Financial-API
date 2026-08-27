import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { FuyaoClient } from '../../src/infrastructure/fuyao/client.js';
import { paginate } from '../../src/infrastructure/fuyao/pagination.js';
import { MAX_RETRY_AFTER_MS, parseRetryAfter } from '../../src/infrastructure/fuyao/retry.js';
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

  test('retries transient HTTP failures without allowing unbounded Retry-After waits', async () => {
    const delays: number[] = [];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        new Response('temporarily unavailable', {
          status: 503,
          headers: { 'retry-after': '3600' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 0, message: 'ok', request_id: 'req_http', data: { done: true } }),
          { headers: { 'content-type': 'application/json' } },
        ),
      );
    const client = new FuyaoClient({
      baseUrl: 'https://fixture.invalid',
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
      fetch,
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
    });

    await expect(
      client.request({ path: '/retry-http', schema: z.object({ done: z.boolean() }) }),
    ).resolves.toMatchObject({ data: { done: true }, requestId: 'req_http' });
    expect(delays).toEqual([MAX_RETRY_AFTER_MS]);
  });

  test('retries HTTP 503 before classifying a valid nonzero Fuyao envelope', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json(
          { code: 1001, message: 'busy', request_id: 'req_503', data: null },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ code: 0, message: 'ok', request_id: 'req_ok', data: { done: true } }),
      );
    const client = new FuyaoClient({
      baseUrl: 'https://fixture.invalid',
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
      fetch,
      sleep: async () => undefined,
    });

    await expect(
      client.request({ path: '/valid-503-envelope', schema: z.object({ done: z.boolean() }) }),
    ).resolves.toMatchObject({ data: { done: true }, requestId: 'req_ok' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('honors Retry-After for valid HTTP 429 envelopes and returns stable HTTP error', async () => {
    const delays: number[] = [];
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
        Response.json(
          { code: 1001, message: 'limited', request_id: 'req_429', data: null },
          { status: 429, headers: { 'retry-after': '2' } },
        ),
      );
    const client = new FuyaoClient({
      baseUrl: 'https://fixture.invalid',
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
      fetch,
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
    });

    await expect(
      client.request({ path: '/valid-429-envelope', schema: z.unknown() }),
    ).rejects.toMatchObject({
      code: 'UPSTREAM_HTTP_429',
      category: 'upstream',
      retryable: true,
      exitCode: 4,
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([2_000, 2_000]);
  });

  test('cancels retry waits through the caller signal', async () => {
    const controller = new AbortController();
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response('temporarily unavailable', {
        status: 503,
        headers: { 'retry-after': '1' },
      }),
    );
    const client = new FuyaoClient({
      baseUrl: 'https://fixture.invalid',
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
      fetch,
      signal: controller.signal,
      sleep: async (_milliseconds, signal) => {
        controller.abort();
        signal?.throwIfAborted();
      },
    });

    await expect(
      client.request({ path: '/cancel', schema: z.object({ done: z.boolean() }) }),
    ).rejects.toMatchObject({ code: 'CLI_CANCELLED', exitCode: 1 });
  });
});

describe('bounded helpers', () => {
  test('caps numeric and date Retry-After values', () => {
    expect(parseRetryAfter('3600')).toBe(MAX_RETRY_AFTER_MS);
    expect(
      parseRetryAfter('Thu, 01 Jan 2026 01:00:00 GMT', Date.parse('2026-01-01T00:00:00Z')),
    ).toBe(MAX_RETRY_AFTER_MS);
  });

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
