import { execa } from 'execa';
import { expect, test } from 'vitest';

test('never echoes an API key on argument errors', async () => {
  const secret = 'unique-secret-value';
  const result = await execa(
    'node',
    ['dist/cli/main.js', '--api-key', secret, 'missing-command', '--format', 'json'],
    { reject: false },
  );
  expect(`${result.stdout}${result.stderr}`).not.toContain(secret);
});
