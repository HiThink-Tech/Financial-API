import { execa } from 'execa';
import { expect, test } from 'vitest';

test('uninstall plan preserves data and returns the final npm command', async () => {
  const result = await execa('node', [
    'dist/cli/main.js',
    'uninstall',
    '--plan',
    '--format',
    'json',
  ]);
  expect(JSON.parse(result.stdout)).toMatchObject({
    ok: true,
    data: {
      purge_data: false,
      npm_command: ['npm', 'uninstall', '-g', '@hithink-tech/hithink-finance-cli'],
    },
  });
});
