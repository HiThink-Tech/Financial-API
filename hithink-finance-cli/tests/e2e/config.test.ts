import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';

test('config show exposes resolved non-secret precedence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-config-cli-'));
  const config = path.join(root, 'config.json');
  await writeFile(
    config,
    JSON.stringify({ dbPath: './configured.duckdb', profile: 'configured', updateCheck: false }),
  );
  try {
    const result = await execa('node', ['dist/cli/main.js', 'config', 'show', '--format', 'json'], {
      env: { HITHINK_FINANCE_CONFIG: config },
    });
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      data: { profile: 'configured', update_check: false },
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('returns a structured error when --config points to a missing file', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-config-cli-'));
  try {
    const result = await execa(
      'node',
      [
        'dist/cli/main.js',
        '--config',
        path.join(root, 'missing.json'),
        'version',
        '--format',
        'json',
      ],
      { reject: false },
    );
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: { code: 'CONFIG_NOT_FOUND', category: 'validation' },
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
