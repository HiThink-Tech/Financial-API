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
  expect(capabilities.capabilities).toHaveLength(44);
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

test('generated Skill manifest pins every owned file by sha256', async () => {
  const manifest = JSON.parse(await readFile('skills/manifest.json', 'utf8')) as {
    files: Record<string, string>;
  };
  expect(Object.keys(manifest.files)).toHaveLength(59);
  expect(Object.values(manifest.files).every((hash) => /^[a-f0-9]{64}$/u.test(hash))).toBe(true);
});
