import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { withExclusiveDataLock } from '../../src/infrastructure/filesystem/process-lock.js';

describe('process lock', () => {
  test('maps a corrupted lock file to a structured local-data error', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'hithink-lock-'));
    await mkdir(root, { recursive: true });
    const lockPath = path.join(root, 'data.lock');
    await writeFile(lockPath, '{not-json', 'utf8');

    await expect(
      withExclusiveDataLock(lockPath, { command: 'data.sync', cliVersion: '0.1.0' }, async () => {
        throw new Error('should not run');
      }),
    ).rejects.toMatchObject({
      code: 'DATA_LOCK_CORRUPT',
      category: 'local-data',
      exitCode: 5,
    });
  });

  test('maps a live lock owner to a retryable structured error', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'hithink-lock-'));
    const lockPath = path.join(root, 'data.lock');
    await writeFile(
      lockPath,
      JSON.stringify({
        pid: process.pid,
        command: 'data.init',
        startedAt: new Date().toISOString(),
      }),
      'utf8',
    );

    await expect(
      withExclusiveDataLock(lockPath, { command: 'data.sync', cliVersion: '0.1.0' }, async () => {
        throw new Error('should not run');
      }),
    ).rejects.toMatchObject({
      code: 'DATA_LOCKED',
      category: 'local-data',
      exitCode: 5,
      retryable: true,
    });
  });

  test('preserves non-EEXIST lock creation failures as local storage errors', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'hithink-lock-open-'));
    const lockPath = path.join(root, 'missing', 'data.lock');

    await expect(
      withExclusiveDataLock(lockPath, { command: 'data.sync', cliVersion: '0.1.0' }, async () => {
        throw new Error('should not run');
      }),
    ).rejects.toMatchObject({
      code: 'DATA_LOCK_OPEN_FAILED',
      category: 'local-data',
      exitCode: 5,
      retryable: false,
      message: expect.stringContaining('ENOENT'),
      debugStack: expect.stringContaining('ENOENT'),
    });
  });
});
