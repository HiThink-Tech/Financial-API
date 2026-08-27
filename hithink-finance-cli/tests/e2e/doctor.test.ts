import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';

test('doctor reports actionable local diagnostics without exposing credentials', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-doctor-'));
  const stateDir = path.join(root, 'local', 'hithink-finance', 'state');
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    path.join(stateDir, 'data.lock'),
    JSON.stringify({ pid: process.pid, command: 'data.sync', startedAt: '2026-08-21T00:00:00Z' }),
  );

  try {
    const secret = 'doctor-must-not-print-this';
    const result = await execa('node', ['dist/cli/main.js', 'doctor', '--format', 'json'], {
      env: {
        ...process.env,
        APPDATA: path.join(root, 'roaming'),
        LOCALAPPDATA: path.join(root, 'local'),
        HITHINK_FINANCE_API_KEY: secret,
      },
    });

    expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      command: 'doctor',
      data: {
        runtime: { package_version: '0.1.5', node_version: expect.any(String) },
        config: { profile: 'default', database: { exists: false } },
        authentication: { configured: true, source: 'environment' },
        data_lock: { present: true, pid: process.pid, command: 'data.sync' },
        duckdb: { available: true },
        skills: { skill_count: 10, targets_verified: false, target_status: 'not-verified' },
      },
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
