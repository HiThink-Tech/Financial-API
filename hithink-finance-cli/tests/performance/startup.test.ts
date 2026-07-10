import { performance } from 'node:perf_hooks';
import { execa } from 'execa';
import { expect, test } from 'vitest';

test('warm version and capabilities stay within a conservative local budget', async () => {
  await execa('node', ['dist/cli/main.js', 'version', '--format', 'json']);
  const start = performance.now();
  await execa('node', ['dist/cli/main.js', 'version', '--format', 'json']);
  await execa('node', ['dist/cli/main.js', 'capabilities', '--format', 'json']);
  expect(performance.now() - start).toBeLessThan(5_000);
});
