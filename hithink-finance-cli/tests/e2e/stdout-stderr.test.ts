import { execa } from 'execa';
import { expect, test } from 'vitest';

test('writes invalid-command JSON only to stderr and exits with code 2', async () => {
  const result = await execa('node', ['dist/cli/main.js', 'does-not-exist', '--format', 'json'], {
    reject: false,
  });

  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe('');
  expect(JSON.parse(result.stderr)).toMatchObject({
    ok: false,
    command: 'does-not-exist',
    error: {
      code: 'CLI_UNKNOWN_COMMAND',
      category: 'validation',
      retryable: false,
    },
    meta: {
      cli_version: '0.1.5',
      schema_version: '1',
    },
  });
});

test('keeps debug diagnostics inside the structured stderr envelope', async () => {
  const result = await execa(
    'node',
    ['dist/cli/main.js', 'does-not-exist', '--debug', '--format', 'json'],
    { reject: false },
  );

  expect(result.exitCode).toBe(2);
  expect(result.stdout).toBe('');
  expect(JSON.parse(result.stderr)).toMatchObject({
    ok: false,
    meta: {
      diagnostics: {
        request_id: expect.any(String),
        stack: expect.stringContaining('CliError'),
      },
    },
  });
});
