import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  acquireUpdateCheckLease,
  releaseUpdateCheckLease,
} from '../../src/infrastructure/updater/check.js';

describe('update check lease', () => {
  test('allows only one concurrent owner', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'hithink-update-lease-'));
    const cacheFile = path.join(root, 'update-cache.json');
    try {
      const [first, second] = await Promise.all([
        acquireUpdateCheckLease(cacheFile),
        acquireUpdateCheckLease(cacheFile),
      ]);
      const owner = first ?? second;
      expect(owner).toBeDefined();
      expect([first, second].filter((lease) => lease !== undefined)).toHaveLength(1);
      await releaseUpdateCheckLease(owner!);
      expect(await acquireUpdateCheckLease(cacheFile)).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('reclaims an expired lease once', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'hithink-update-stale-'));
    const cacheFile = path.join(root, 'update-cache.json');
    const leasePath = path.join(root, 'update-check.lock');
    try {
      await writeFile(
        leasePath,
        JSON.stringify({ pid: process.pid, startedAt: 0, token: 'stale' }),
        'utf8',
      );
      const lease = await acquireUpdateCheckLease(cacheFile, { now: () => 6 * 60_000 });
      expect(lease?.token).not.toBe('stale');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('does not reclaim a newly created lease before its owner finishes writing', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'hithink-update-publishing-'));
    const cacheFile = path.join(root, 'update-cache.json');
    const leasePath = path.join(root, 'update-check.lock');
    try {
      await writeFile(leasePath, '', 'utf8');

      expect(await acquireUpdateCheckLease(cacheFile)).toBeUndefined();
      expect(await readFile(leasePath, 'utf8')).toBe('');

      await writeFile(leasePath, JSON.stringify({ pid: process.pid }), 'utf8');
      expect(await acquireUpdateCheckLease(cacheFile)).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('reclaims an unparseable lease only after its filesystem age expires', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'hithink-update-corrupt-'));
    const cacheFile = path.join(root, 'update-cache.json');
    const leasePath = path.join(root, 'update-check.lock');
    try {
      await writeFile(leasePath, '', 'utf8');
      const expired = new Date(Date.now() - 6 * 60_000);
      await utimes(leasePath, expired, expired);

      expect(await acquireUpdateCheckLease(cacheFile)).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
