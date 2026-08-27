import { execa } from 'execa';
import { expect, test } from 'vitest';

test('auth login fails non-interactively without exposing or storing a key', async () => {
  const result = await execa(
    'node',
    ['dist/cli/main.js', 'auth', 'login', '--no-input', '--format', 'json'],
    { reject: false },
  );

  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe('');
  expect(JSON.parse(result.stderr)).toMatchObject({
    ok: false,
    command: 'auth',
    error: {
      code: 'CLI_MISSING_ARGUMENT',
      hint: expect.stringContaining('https://fuyao.aicubes.cn/admin'),
    },
  });
});

test('rejects ambiguous API key input methods before reading stdin', async () => {
  const result = await execa(
    'node',
    [
      'dist/cli/main.js',
      'auth',
      'login',
      '--api-key',
      'top-secret',
      '--api-key-stdin',
      '--format',
      'json',
    ],
    { reject: false },
  );

  expect(result.exitCode).toBe(2);
  expect(`${result.stdout}${result.stderr}`).not.toContain('top-secret');
  expect(JSON.parse(result.stderr)).toMatchObject({
    error: { code: 'CLI_CONFLICTING_ARGUMENTS' },
  });
});

test('keeps deprecated --api-key compatible while emitting one redacted warning', async () => {
  const secret = 'deprecated-secret';
  const result = await execa(
    'node',
    ['dist/cli/main.js', 'version', '--api-key', secret, '--format', 'json'],
    { reject: false },
  );

  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, command: 'version' });
  expect(result.stderr).toContain('Deprecated: --api-key');
  expect(result.stderr.match(/Deprecated: --api-key/g)).toHaveLength(1);
  expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
});
