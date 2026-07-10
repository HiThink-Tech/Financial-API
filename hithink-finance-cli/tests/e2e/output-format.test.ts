import { execa } from 'execa';
import { expect, test } from 'vitest';

test('renders explicit csv format as comma-separated values', async () => {
  const result = await execa('node', ['dist/cli/main.js', 'version', '--format', 'csv']);

  expect(result.stdout).toContain('package,version,node');
  expect(result.stdout).toContain('@hithink-tech/hithink-finance-cli');
  expect(() => JSON.parse(result.stdout)).toThrow();
});

test('renders explicit table format as a human-readable table', async () => {
  const result = await execa('node', ['dist/cli/main.js', 'version', '--format', 'table']);

  expect(result.stdout).toContain('| key');
  expect(result.stdout).toContain('| package');
  expect(result.stdout).toContain('@hithink-tech/hithink-finance-cli');
  expect(() => JSON.parse(result.stdout)).toThrow();
});
