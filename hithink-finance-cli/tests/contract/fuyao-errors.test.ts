import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { FuyaoClient } from '../../src/infrastructure/fuyao/client.js';

function errorFetch(code: number): { fetch: typeof globalThis.fetch; attempts: () => number } {
  let count = 0;
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => {
    count += 1;
    return new Response(
      JSON.stringify({ code, message: `business-${code}`, request_id: `req_${count}`, data: null }),
      { headers: { 'content-type': 'application/json' } },
    );
  });
  return { fetch, attempts: () => count };
}

describe.each([
  [1001, 'validation', 2, false],
  [2001, 'authentication', 3, false],
  [2003, 'authentication', 3, false],
] as const)('business error %i', (code, category, exitCode, retryable) => {
  test('maps immediately without retry', async () => {
    const fixture = errorFetch(code);
    const client = new FuyaoClient({
      baseUrl: 'https://fixture.invalid',
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
      fetch: fixture.fetch,
      sleep: async () => undefined,
    });

    await expect(client.request({ path: '/error', schema: z.unknown() })).rejects.toMatchObject({
      code: `FUYAO_${code}`,
      category,
      exitCode,
      retryable,
      requestId: 'req_1',
    });
    expect(fixture.attempts()).toBe(1);
  });
});

describe.each([4001, 5001, 5002, 5003])('retryable business error %i', (code) => {
  test('fails after exactly three attempts and preserves the last request ID', async () => {
    const fixture = errorFetch(code);
    const client = new FuyaoClient({
      baseUrl: 'https://fixture.invalid',
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
      fetch: fixture.fetch,
      sleep: async () => undefined,
      random: () => 0,
    });

    await expect(client.request({ path: '/error', schema: z.unknown() })).rejects.toMatchObject({
      code: `FUYAO_${code}`,
      category: 'upstream',
      exitCode: 4,
      retryable: true,
      requestId: 'req_3',
    });
    expect(fixture.attempts()).toBe(3);
  });
});
