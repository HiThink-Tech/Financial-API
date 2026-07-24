import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'vitest';

const names = [
  'shared',
  'symbol',
  'market',
  'special-data',
  'financials',
  'valuation',
  'index',
  'fund',
  'data',
  'research',
].map((n) => `hithink-finance-${n}`);

test('ships exactly ten valid Skills with shared dependency rules', async () => {
  expect(names).toHaveLength(10);
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
