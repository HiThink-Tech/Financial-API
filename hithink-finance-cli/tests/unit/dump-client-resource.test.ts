import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

test('dump hashing stays inside the streaming pipeline', async () => {
  const source = await readFile('src/infrastructure/duckdb/dump-client.ts', 'utf8');

  expect(source).not.toMatch(/readFile\(temporary\)/u);
  expect(source).toContain('hash.update(chunk)');
});
