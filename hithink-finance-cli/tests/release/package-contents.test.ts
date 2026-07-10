import { execa } from 'execa';
import { expect, test } from 'vitest';

test('npm tarball contains only the runtime allowlist', async () => {
  const result = await execa('npm', ['pack', '--dry-run', '--json', '--ignore-scripts']);
  const packs = JSON.parse(result.stdout) as Array<{ files: Array<{ path: string }> }>;
  const files = packs[0]!.files.map((file) => file.path);
  expect(files).toEqual(
    expect.arrayContaining([
      'package.json',
      'README.md',
      'dist/cli/main.js',
      'schemas/capabilities.json',
      'migrations/manifest.json',
      'skills/manifest.json',
    ]),
  );
  expect(files.some((file) => /(^|\/)(tests|src|sdd-docs|python)(\/|$)/u.test(file))).toBe(false);
  expect(files.some((file) => /\.env|\.map$/u.test(file))).toBe(false);
});
