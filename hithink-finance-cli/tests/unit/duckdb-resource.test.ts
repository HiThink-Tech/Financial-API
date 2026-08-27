import { describe, expect, test, vi } from 'vitest';
import type { DuckDBConnection } from '@duckdb/node-api';
import {
  duckDbRuntimeOptions,
  withDuckDbInterrupt,
} from '../../src/infrastructure/duckdb/connection.js';

describe('DuckDB resource governance', () => {
  test('uses conservative defaults and validated environment overrides', () => {
    expect(duckDbRuntimeOptions({}, 16 * 1024 ** 3, 16)).toEqual({
      memory_limit: '1024MiB',
      threads: '4',
    });
    expect(
      duckDbRuntimeOptions(
        {
          HITHINK_FINANCE_DUCKDB_MEMORY_LIMIT: '768MiB',
          HITHINK_FINANCE_DUCKDB_THREADS: '2',
        },
        16 * 1024 ** 3,
        16,
      ),
    ).toEqual({ memory_limit: '768MiB', threads: '2' });
    expect(() =>
      duckDbRuntimeOptions({ HITHINK_FINANCE_DUCKDB_THREADS: '0' }, 1024 ** 3, 4),
    ).toThrowError(expect.objectContaining({ code: 'DUCKDB_CONFIG_INVALID' }));
    expect(() =>
      duckDbRuntimeOptions({ HITHINK_FINANCE_DUCKDB_MEMORY_LIMIT: '0MiB' }, 1024 ** 3, 4),
    ).toThrowError(expect.objectContaining({ code: 'DUCKDB_CONFIG_INVALID' }));
  });

  test('interrupts an active operation and removes the abort listener', async () => {
    const controller = new AbortController();
    const interrupt = vi.fn();
    let rejectOperation: ((error: Error) => void) | undefined;
    const operation = new Promise<void>((_resolve, reject) => {
      rejectOperation = reject;
    });
    interrupt.mockImplementation(() => rejectOperation?.(new Error('interrupted')));
    const connection = { interrupt } as unknown as DuckDBConnection;

    const result = withDuckDbInterrupt(connection, controller.signal, async () => operation);
    controller.abort('SIGINT');

    await expect(result).rejects.toMatchObject({ code: 'CLI_CANCELLED' });
    expect(interrupt).toHaveBeenCalledTimes(1);
  });
});
