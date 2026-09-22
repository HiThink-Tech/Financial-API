import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import {
  buildSkillManifest,
  reconcileManagedSkills,
  removeManagedSkills,
} from '../../src/infrastructure/skills/manifest.js';
import {
  dedicatedSkillTargets,
  removeDedicatedSkills,
  syncDedicatedSkills,
  skillsCliArguments,
  skillsRemoveArguments,
} from '../../src/infrastructure/skills/installer.js';
import { readBundledSkillsStatus } from '../../src/infrastructure/skills/status.js';

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

test('removes only the twelve package-owned skill names from every agent', () => {
  const invocation = skillsRemoveArguments('C:/pkg');
  expect(invocation.args).toEqual(expect.arrayContaining(['remove', '--global', '--yes']));
  expect(
    invocation.args.filter((argument) => argument.startsWith('hithink-finance-')),
  ).toHaveLength(12);
  expect(invocation.args).not.toContain('--agent');
  expect(invocation.args).not.toContain('--all');
});

test('reports bundled Skills without claiming Agent discovery targets were verified', async () => {
  const packageRoot = path.resolve(import.meta.dirname, '../..');
  const status = await readBundledSkillsStatus(packageRoot);

  expect(status).toMatchObject({
    cliVersion: '0.1.13',
    skillCount: 12,
    targetsVerified: false,
    targetStatus: 'not-verified',
  });
  expect(status.fileCount).toBeGreaterThan(10);
  expect(status.canonical.replaceAll('\\', '/')).toMatch(/\/skills$/);
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

async function writeCanonicalSkills(
  packageRoot: string,
  content: string,
  version: string,
): Promise<void> {
  const source = path.join(packageRoot, 'skills');
  await rm(path.join(source, 'manifest.json'), { force: true });
  await mkdir(path.join(source, 'hithink-finance-test', 'references'), { recursive: true });
  await writeFile(path.join(source, 'hithink-finance-test', 'SKILL.md'), content);
  await writeFile(
    path.join(source, 'hithink-finance-test', 'references', 'usage.md'),
    `usage-${version}`,
  );
  const manifest = await buildSkillManifest(source, version);
  await writeFile(path.join(source, 'manifest.json'), JSON.stringify(manifest));
}

test('detects only installed WorkBuddy and QClaw user roots', async () => {
  const home = await root();
  await mkdir(path.join(home, '.workbuddy'));

  expect(await dedicatedSkillTargets(home)).toEqual([
    expect.objectContaining({
      name: 'workbuddy',
      skillsRoot: path.join(home, '.workbuddy', 'skills'),
    }),
  ]);
  expect(await readdir(home)).toEqual(['.workbuddy']);
});

test('syncs dedicated WorkBuddy and QClaw targets and backs up local changes', async () => {
  const base = await root();
  const packageRoot = path.join(base, 'package');
  const home = path.join(base, 'home');
  await Promise.all([
    mkdir(path.join(home, '.workbuddy'), { recursive: true }),
    mkdir(path.join(home, '.qclaw'), { recursive: true }),
  ]);
  await writeCanonicalSkills(packageRoot, 'official-v1', '0.1.0');

  const first = await syncDedicatedSkills(packageRoot, home);
  expect(first.targets.map((target) => target.name)).toEqual(['workbuddy', 'qclaw']);
  for (const client of ['.workbuddy', '.qclaw']) {
    expect(
      await readFile(path.join(home, client, 'skills', 'hithink-finance-test', 'SKILL.md'), 'utf8'),
    ).toBe('official-v1');
  }

  const workBuddySkill = path.join(
    home,
    '.workbuddy',
    'skills',
    'hithink-finance-test',
    'SKILL.md',
  );
  await writeFile(workBuddySkill, 'user-change');
  await writeCanonicalSkills(packageRoot, 'official-v2', '0.2.0');

  const second = await syncDedicatedSkills(packageRoot, home);
  expect(await readFile(workBuddySkill, 'utf8')).toBe('official-v2');
  expect(second.backups).toHaveLength(1);
  expect(await readFile(second.backups[0]!, 'utf8')).toBe('user-change');
});

test('removes only CLI-managed files from dedicated targets', async () => {
  const base = await root();
  const packageRoot = path.join(base, 'package');
  const home = path.join(base, 'home');
  const targetSkill = path.join(home, '.workbuddy', 'skills', 'hithink-finance-test');
  await mkdir(path.join(home, '.workbuddy'), { recursive: true });
  await writeCanonicalSkills(packageRoot, 'official', '0.1.0');
  await syncDedicatedSkills(packageRoot, home);
  await writeFile(path.join(targetSkill, 'notes.md'), 'user-owned');

  const result = await removeDedicatedSkills(home);

  expect(result.targets.map((target) => target.name)).toEqual(['workbuddy']);
  expect(await readdir(targetSkill)).toEqual(['notes.md']);
  expect(await readdir(home)).toEqual(['.workbuddy']);
});

test('rejects a dedicated manifest that escapes the managed Skill directory', async () => {
  const base = await root();
  const packageRoot = path.join(base, 'package');
  const home = path.join(base, 'home');
  const clientRoot = path.join(home, '.workbuddy');
  const protectedFile = path.join(home, 'protected.txt');
  await mkdir(clientRoot, { recursive: true });
  await writeCanonicalSkills(packageRoot, 'official', '0.1.0');
  await writeFile(protectedFile, 'keep');
  await writeFile(
    path.join(clientRoot, '.hithink-finance-cli-skills-manifest.json'),
    JSON.stringify({
      protocolVersion: '1',
      cliVersion: '0.1.0',
      files: { '../../protected.txt': '0'.repeat(64) },
    }),
  );

  await expect(removeDedicatedSkills(home)).rejects.toThrow('Invalid managed Skills manifest');
  expect(await readFile(protectedFile, 'utf8')).toBe('keep');
});

test('preserves manually installed Skills when no dedicated ownership manifest exists', async () => {
  const home = await root();
  const manualSkill = path.join(home, '.workbuddy', 'skills', 'hithink-finance-test', 'SKILL.md');
  await mkdir(path.dirname(manualSkill), { recursive: true });
  await writeFile(manualSkill, 'manual');

  const result = await removeDedicatedSkills(home);

  expect(result.targets).toEqual([]);
  expect(await readFile(manualSkill, 'utf8')).toBe('manual');
});

test('rejects a dedicated Skill directory symbolic link during sync and removal', async () => {
  const base = await root();
  const packageRoot = path.join(base, 'package');
  const home = path.join(base, 'home');
  const clientRoot = path.join(home, '.workbuddy');
  const outside = path.join(base, 'outside');
  await Promise.all([
    mkdir(clientRoot, { recursive: true }),
    mkdir(path.join(outside, 'hithink-finance-test'), { recursive: true }),
  ]);
  await writeCanonicalSkills(packageRoot, 'official', '0.1.0');
  await symlink(outside, path.join(clientRoot, 'skills'), 'junction');

  await expect(syncDedicatedSkills(packageRoot, home)).rejects.toThrow(
    'Refusing to manage Skills through a symbolic link',
  );

  await rm(path.join(clientRoot, 'skills'));
  await syncDedicatedSkills(packageRoot, home);
  await rm(path.join(clientRoot, 'skills'), { recursive: true });
  await symlink(outside, path.join(clientRoot, 'skills'), 'junction');

  await expect(removeDedicatedSkills(home)).rejects.toThrow(
    'Refusing to manage Skills through a symbolic link',
  );
});

test('repairs a corrupt dedicated manifest and keeps it as a diagnostic backup', async () => {
  const base = await root();
  const packageRoot = path.join(base, 'package');
  const home = path.join(base, 'home');
  const clientRoot = path.join(home, '.qclaw');
  await mkdir(clientRoot, { recursive: true });
  await writeCanonicalSkills(packageRoot, 'official', '0.1.0');
  await writeFile(path.join(clientRoot, '.hithink-finance-cli-skills-manifest.json'), '{broken');

  const result = await syncDedicatedSkills(packageRoot, home);

  expect(result.backups).toHaveLength(1);
  expect(result.backups[0]).toContain('.invalid-');
  expect(await readFile(result.backups[0]!, 'utf8')).toBe('{broken');
  expect(
    JSON.parse(
      await readFile(path.join(clientRoot, '.hithink-finance-cli-skills-manifest.json'), 'utf8'),
    ),
  ).toMatchObject({ protocolVersion: '1', cliVersion: '0.1.0' });
});

test('rejects a symbolic link on a retired path from the previous manifest', async () => {
  const base = await root();
  const packageRoot = path.join(base, 'package');
  const home = path.join(base, 'home');
  const clientRoot = path.join(home, '.workbuddy');
  const source = path.join(packageRoot, 'skills');
  const targetReferences = path.join(clientRoot, 'skills', 'hithink-finance-test', 'references');
  const outside = path.join(base, 'outside');
  await mkdir(clientRoot, { recursive: true });
  await writeCanonicalSkills(packageRoot, 'official-v1', '0.1.0');
  await syncDedicatedSkills(packageRoot, home);

  await rm(path.join(source, 'manifest.json'));
  await rm(path.join(source, 'hithink-finance-test', 'references'), { recursive: true });
  const next = await buildSkillManifest(source, '0.2.0');
  await writeFile(path.join(source, 'manifest.json'), JSON.stringify(next));
  await rm(targetReferences, { recursive: true });
  await mkdir(outside, { recursive: true });
  await writeFile(path.join(outside, 'usage.md'), 'outside');
  await symlink(outside, targetReferences, 'junction');

  await expect(syncDedicatedSkills(packageRoot, home)).rejects.toThrow(
    'Refusing to manage Skills through a symbolic link',
  );
  expect(await readFile(path.join(outside, 'usage.md'), 'utf8')).toBe('outside');
});

test('does not quarantine a corrupt manifest through a client root junction', async () => {
  const base = await root();
  const packageRoot = path.join(base, 'package');
  const home = path.join(base, 'home');
  const outside = path.join(base, 'outside');
  const marker = path.join(outside, '.hithink-finance-cli-skills-manifest.json');
  await Promise.all([mkdir(home), mkdir(outside)]);
  await writeCanonicalSkills(packageRoot, 'official', '0.1.0');
  await writeFile(marker, '{broken');
  await symlink(outside, path.join(home, '.workbuddy'), 'junction');

  await expect(syncDedicatedSkills(packageRoot, home)).rejects.toThrow(
    'Refusing to manage Skills through a symbolic link',
  );
  expect(await readFile(marker, 'utf8')).toBe('{broken');
  expect((await readdir(outside)).filter((name) => name.includes('.invalid-'))).toEqual([]);
});
