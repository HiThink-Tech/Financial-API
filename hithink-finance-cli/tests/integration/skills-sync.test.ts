import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import {
  buildSkillManifest,
  reconcileManagedSkills,
  removeManagedSkills,
} from '../../src/infrastructure/skills/manifest.js';
import {
  skillsCliArguments,
  skillsRemoveArguments,
} from '../../src/infrastructure/skills/installer.js';

const roots: string[] = [];
async function root(): Promise<string> {
  const value = await mkdtemp(path.join(tmpdir(), 'hithink-skills-'));
  roots.push(value);
  return value;
}
afterEach(async () =>
  Promise.all(roots.splice(0).map((value) => rm(value, { recursive: true, force: true }))),
);

test('uses pinned local skills CLI with global copy mode and no telemetry', () => {
  const invocation = skillsCliArguments('C:/pkg');
  expect(invocation.command).toBe(process.execPath);
  expect(invocation.args[0]?.replaceAll('\\', '/')).toContain('node_modules/skills/bin/cli.mjs');
  expect(invocation.args[1]).toBe('add');
  expect(invocation.args).toEqual(
    expect.arrayContaining(['--global', '--copy', '--all', '--full-depth']),
  );
  expect(invocation.env.DISABLE_TELEMETRY).toBe('1');
  expect(invocation.args.join(' ')).not.toContain('latest');
});

test('removes only the nine package-owned skill names from every agent', () => {
  const invocation = skillsRemoveArguments('C:/pkg');
  expect(invocation.args).toEqual(expect.arrayContaining(['remove', '--global', '--yes']));
  expect(
    invocation.args.filter((argument) => argument.startsWith('hithink-finance-')),
  ).toHaveLength(9);
  expect(invocation.args).not.toContain('--agent');
  expect(invocation.args).not.toContain('--all');
});

test('backs up user-modified managed files and repairs canonical content', async () => {
  const base = await root();
  const source = path.join(base, 'source');
  const target = path.join(base, 'target');
  await mkdir(path.join(source, 'skill-a'), { recursive: true });
  await writeFile(path.join(source, 'skill-a', 'SKILL.md'), 'official-v1');
  const previous = await buildSkillManifest(source, '0.1.0');
  await reconcileManagedSkills(source, target, previous);
  await writeFile(path.join(target, 'skill-a', 'SKILL.md'), 'user-change');
  await writeFile(path.join(source, 'skill-a', 'SKILL.md'), 'official-v2');
  const next = await buildSkillManifest(source, '0.2.0');
  const result = await reconcileManagedSkills(source, target, next, previous);
  expect(await readFile(path.join(target, 'skill-a', 'SKILL.md'), 'utf8')).toBe('official-v2');
  expect(result.backups).toHaveLength(1);
  expect(await readFile(result.backups[0]!, 'utf8')).toBe('user-change');
});

test('removes only manifest-owned files', async () => {
  const base = await root();
  const source = path.join(base, 'source');
  const target = path.join(base, 'target');
  await mkdir(path.join(source, 'skill-a'), { recursive: true });
  await mkdir(path.join(target, 'skill-a'), { recursive: true });
  await writeFile(path.join(source, 'skill-a', 'SKILL.md'), 'official');
  await writeFile(path.join(target, 'skill-a', 'SKILL.md'), 'official');
  await writeFile(path.join(target, 'skill-a', 'notes.md'), 'user');
  const manifest = await buildSkillManifest(source, '0.1.0');
  await removeManagedSkills(target, manifest);
  expect(await readdir(path.join(target, 'skill-a'))).toEqual(['notes.md']);
});
