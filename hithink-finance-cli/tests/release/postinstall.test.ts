import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

test('postinstall is best-effort and points to the pinned package-local CLI', async () => {
  const source = await readFile('scripts/postinstall.mjs', 'utf8');
  expect(source).toContain("node_modules', 'skills', 'bin', 'cli.mjs");
  expect(source).toContain('DISABLE_TELEMETRY');
  expect(source).toContain('skills sync --repair');
  expect(source).not.toContain('npx');
  expect(source).not.toContain('@latest');
});
