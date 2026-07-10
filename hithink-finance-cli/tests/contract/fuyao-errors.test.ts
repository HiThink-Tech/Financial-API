import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, test } from 'vitest';
import { z } from 'zod';
import { FuyaoClient } from '../../src/infrastructure/fuyao/client.js';

const servers: Server[] = [];

async function errorServer(code: number): Promise<{ baseUrl: string; attempts: () => number }> {
  let count = 0;
  const server = createServer((_request, response) => {
    count += 1;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({ code, message: `business-${code}`, request_id: `req_${count}`, data: null }),
    );
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('fixture server unavailable');
  return { baseUrl: `http://127.0.0.1:${address.port}`, attempts: () => count };
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

describe.each([
  [1001, 'validation', 2, false],
  [2001, 'authentication', 3, false],
  [2003, 'authentication', 3, false],
] as const)('business error %i', (code, category, exitCode, retryable) => {
  test('maps immediately without retry', async () => {
    const fixture = await errorServer(code);
    const client = new FuyaoClient({
      baseUrl: fixture.baseUrl,
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
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
    const fixture = await errorServer(code);
    const client = new FuyaoClient({
      baseUrl: fixture.baseUrl,
      auth: { method: 'api-key', profile: 'default', apiKey: 'test-key', source: 'explicit' },
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
