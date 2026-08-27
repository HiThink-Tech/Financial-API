import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DuckDBConnection } from '@duckdb/node-api';

const { renameMock, rmMock } = vi.hoisted(() => ({
  renameMock: vi.fn(),
  rmMock: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  rename: renameMock,
  rm: rmMock,
}));

import { exportQuery } from '../../src/application/use-cases/local-query.js';

function connectionThat(abortAfterCount?: () => void): DuckDBConnection {
  const prepared = { statementType: 1, destroySync: vi.fn() };
  return {
    extractStatements: vi.fn(async () => ({
      count: 1,
      prepare: vi.fn(async () => prepared),
    })),
    run: vi.fn(async () => undefined),
    runAndReadAll: vi.fn(async () => {
      abortAfterCount?.();
      return { getRowsJson: () => [[3]] };
    }),
    interrupt: vi.fn(),
  } as unknown as DuckDBConnection;
}

describe('export cancellation commit boundary', () => {
  beforeEach(() => {
    renameMock.mockReset();
    rmMock.mockReset();
    renameMock.mockResolvedValue(undefined);
    rmMock.mockResolvedValue(undefined);
  });

  test('returns success when cancellation arrives during the final rename', async () => {
    const controller = new AbortController();
    renameMock.mockImplementation(async () => controller.abort('SIGINT'));

    await expect(
      exportQuery(
        connectionThat(),
        'SELECT * FROM range(3) t(n)',
        path.join(tmpdir(), 'committed.ndjson'),
        'ndjson',
        controller.signal,
      ),
    ).resolves.toBe(3);
    expect(renameMock).toHaveBeenCalledOnce();
  });

  test('cancels and cleans the temporary file before rename starts', async () => {
    const controller = new AbortController();

    await expect(
      exportQuery(
        connectionThat(() => controller.abort('SIGINT')),
        'SELECT * FROM range(3) t(n)',
        path.join(tmpdir(), 'cancelled.ndjson'),
        'ndjson',
        controller.signal,
      ),
    ).rejects.toMatchObject({ code: 'CLI_CANCELLED' });
    expect(renameMock).not.toHaveBeenCalled();
    expect(rmMock).toHaveBeenCalledOnce();
  });
});
