import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';

test('prints package and executable version', async () => {
  const result = await execa('node', ['dist/cli/main.js', 'version', '--format', 'json']);

  expect(JSON.parse(result.stdout)).toMatchObject({
    ok: true,
    command: 'version',
    data: {
      package: '@hithink-tech/hithink-finance-cli',
    },
  });
});

test('supports conventional --version and caller request IDs', async () => {
  const version = await execa('node', ['dist/cli/main.js', '--version']);
  expect(version.stdout).toMatch(/^\d+\.\d+\.\d+/u);
  const result = await execa('node', [
    'dist/cli/main.js',
    'version',
    '--request-id',
    'caller-123',
    '--format',
    'json',
  ]);
  expect(JSON.parse(result.stdout).meta.request_id).toBe('caller-123');
});

test('prints cached update notice to stderr after normal JSON command', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-version-notice-'));
  const stateDir = path.join(root, 'hithink-finance', 'state');
  await mkdir(stateDir, { recursive: true });
  const cacheFile = path.join(stateDir, 'update-cache.json');
  await writeFile(
    cacheFile,
    JSON.stringify({
      checkedAt: Date.now(),
      status: 'success',
      latestVersion: '0.2.0',
    }) + '\n',
  );

  const result = await execa('node', ['dist/cli/main.js', 'version', '--format', 'json'], {
    env: {
      LOCALAPPDATA: root,
    },
  });

  expect(JSON.parse(result.stdout)).toMatchObject({
    ok: true,
    command: 'version',
  });
  expect(result.stderr).toContain('0.2.0');
  expect(result.stderr).toContain('hithink-finance update --check');
  expect(JSON.parse(await readFile(cacheFile, 'utf8'))).toMatchObject({
    promptedAt: expect.any(Number),
    promptedCurrentVersion: '0.1.0',
    promptedLatestVersion: '0.2.0',
  });
});
