import { execa } from 'execa';
import { expect, test } from 'vitest';

test('rejects non-SemVer update targets before process execution', async () => {
  const result = await execa(
    'node',
    ['dist/cli/main.js', 'update', '--target-version', '1.0.0 & echo injected', '--format', 'json'],
    { reject: false },
  );
  expect(result.exitCode).toBe(2);
  expect(JSON.parse(result.stderr)).toMatchObject({ error: { code: 'CLI_BAD_ARGUMENT' } });
});
