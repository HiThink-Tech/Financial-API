import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'vitest';

const names = [
  'shared',
  'symbol',
  'market',
  'special-data',
  'financials',
  'index',
  'fund',
  'data',
  'research',
].map((n) => `hithink-finance-${n}`);

test('ships exactly nine valid Skills with shared dependency rules', async () => {
  expect(names).toHaveLength(9);
  for (const name of names) {
    const file = path.resolve('skills', name, 'SKILL.md');
    await expect(access(file)).resolves.toBeUndefined();
    const text = await readFile(file, 'utf8');
    expect(text).toMatch(/^---\r?\nname:/u);
    expect(text).toContain('description:');
    if (name !== 'hithink-finance-shared') expect(text).toContain('hithink-finance-shared');
    expect(text).toContain('--format json');
  }
});
