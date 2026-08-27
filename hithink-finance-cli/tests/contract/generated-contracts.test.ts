import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';

function normalizeLineEndings(value: string): string {
  return value.replaceAll('\r\n', '\n');
}

test('publishes generated capability and envelope schemas', async () => {
  await expect(access('schemas/capabilities.json')).resolves.toBeUndefined();
  const capabilities = JSON.parse(await readFile('schemas/capabilities.json', 'utf8')) as {
    capabilities: unknown[];
  };
  expect(capabilities.capabilities).toHaveLength(69);
  await expect(access('schemas/command-envelope.schema.json')).resolves.toBeUndefined();
});

test('checked-in contracts are fresh after line-ending normalization', async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'hithink-contracts-'));
  try {
    await execa('node', ['scripts/generate-contracts.mjs', output]);
    for (const relative of [
      'schemas/capabilities.json',
      'schemas/command-envelope.schema.json',
      'skills/hithink-finance-data/SKILL.md',
      'skills/hithink-finance-market/SKILL.md',
      'skills/hithink-finance-fund/SKILL.md',
      'skills/hithink-finance-valuation/SKILL.md',
      'skills/hithink-finance-shared/SKILL.md',
      'skills/hithink-finance-shared/references/lifecycle.md',
      'skills/manifest.json',
    ]) {
      expect(normalizeLineEndings(await readFile(path.join(output, relative), 'utf8'))).toBe(
        normalizeLineEndings(await readFile(relative, 'utf8')),
      );
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('generated lifecycle guidance keeps the doctor rule at the top list level', async () => {
  const lifecycle = await readFile('skills/hithink-finance-shared/references/lifecycle.md', 'utf8');
  expect(lifecycle).toMatch(/^- 诊断输出包括/imu);
  expect(lifecycle).not.toMatch(/^\s{2,}- 诊断输出包括/imu);
});

test('generated Skill manifest pins every owned file by sha256', async () => {
  const manifest = JSON.parse(await readFile('skills/manifest.json', 'utf8')) as {
    files: Record<string, string>;
  };
  expect(Object.keys(manifest.files)).toHaveLength(84);
  expect(Object.values(manifest.files).every((hash) => /^[a-f0-9]{64}$/u.test(hash))).toBe(true);
});

test('generated fund-news Skill terminates cursor paging with has_more', async () => {
  const news = await readFile('skills/hithink-finance-fund/references/fund-news.md', 'utf8');
  expect(news).toContain('`has_more=false`');
  expect(news).not.toContain('返回条数小于 limit');
});

test('generated domain Skills advertise every newly routed intent before shortcuts', async () => {
  const market = (await readFile('skills/hithink-finance-market/SKILL.md', 'utf8')).split(
    '## Shortcuts',
    1,
  )[0];
  const special = (await readFile('skills/hithink-finance-special-data/SKILL.md', 'utf8')).split(
    '## Shortcuts',
    1,
  )[0];
  const fund = (await readFile('skills/hithink-finance-fund/SKILL.md', 'utf8')).split(
    '## Shortcuts',
    1,
  )[0];

  for (const required of ['集合竞价', 'market auction-snapshot', 'market auction-benchmark']) {
    expect(market).toContain(required);
  }
  for (const required of ['跌停', '炸板', 'special limit-down-pool', 'special limit-break-pool']) {
    expect(special).toContain(required);
  }
  for (const required of [
    '基金公司',
    '基金经理',
    '基金财务',
    '基金资讯',
    'fund company-detail',
    'fund manager-detail',
    'fund financial-indicators',
    'fund news',
  ]) {
    expect(fund).toContain(required);
  }
});
