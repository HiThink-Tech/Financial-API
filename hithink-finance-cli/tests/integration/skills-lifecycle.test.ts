import {
  access,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { buildSkillManifest } from '../../src/infrastructure/skills/manifest.js';
import {
  readSkillsLifecycleStatus,
  removeLifecycleSkills,
  syncLifecycleSkills,
  type SkillsLifecyclePaths,
} from '../../src/infrastructure/skills/lifecycle.js';

const roots: string[] = [];
async function fixture(): Promise<{
  packageRoot: string;
  paths: SkillsLifecyclePaths;
  home: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-skills-lifecycle-'));
  roots.push(root);
  const packageRoot = path.join(root, 'package');
  const source = path.join(packageRoot, 'skills');
  await mkdir(path.join(source, 'hithink-finance-test'), { recursive: true });
  await writeFile(path.join(source, 'hithink-finance-test', 'SKILL.md'), 'official-v1');
  const manifest = await buildSkillManifest(source, '0.1.0');
  await writeFile(path.join(source, 'manifest.json'), JSON.stringify(manifest));
  return {
    packageRoot,
    home: path.join(root, 'home'),
    paths: {
      configDir: path.join(root, 'config'),
      dataDir: path.join(root, 'data'),
      stateDir: path.join(root, 'state'),
    },
  };
}
afterEach(async () =>
  Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))),
);

test('auto mode does not mistake a historical Skills-only directory for an installed Agent', async () => {
  const value = await fixture();
  await mkdir(path.join(value.home, '.codex', 'skills'), { recursive: true });
  const result = await syncLifecycleSkills(value.packageRoot, value.paths, { homeDir: value.home });
  expect(result.targets).toEqual([]);
  await expect(
    access(path.join(value.home, '.codex', 'skills', 'hithink-finance-test')),
  ).rejects.toMatchObject({ code: 'ENOENT' });
});

test('persists explicit targets, appends later Agents, and shares one linked content copy', async () => {
  const value = await fixture();
  const first = await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['codex'],
  });
  expect(first.targets.map((target) => target.name)).toEqual(['codex']);
  const second = await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['claude-code'],
  });
  expect(second.targets.map((target) => target.name)).toEqual(
    expect.arrayContaining(['codex', 'claude-code']),
  );
  for (const agent of ['.codex', '.claude']) {
    const target = path.join(value.home, agent, 'skills', 'hithink-finance-test');
    expect((await lstat(target)).isSymbolicLink()).toBe(true);
    expect(await readFile(path.join(target, 'SKILL.md'), 'utf8')).toBe('official-v1');
  }
  const status = await readSkillsLifecycleStatus(value.packageRoot, value.paths, value.home);
  expect(status.strategy).toMatchObject({ mode: 'auto', explicit: ['codex', 'claude-code'] });
  expect(status).toMatchObject({ targetsVerified: true, targetStatus: 'ready' });
  expect(status.targets.every((target) => target.status === 'ready')).toBe(true);
});

test('repairs a broken link and preserves a selected copy delivery mode', async () => {
  const value = await fixture();
  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['workbuddy'],
    copy: true,
  });
  const copy = path.join(value.home, '.workbuddy', 'skills', 'hithink-finance-test', 'SKILL.md');
  expect((await lstat(path.dirname(copy))).isSymbolicLink()).toBe(false);
  await writeFile(copy, 'damaged');
  await syncLifecycleSkills(value.packageRoot, value.paths, { homeDir: value.home });
  expect(await readFile(copy, 'utf8')).toBe('official-v1');

  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['qclaw'],
  });
  const link = path.join(value.home, '.qclaw', 'skills', 'hithink-finance-test');
  await rm(link, { recursive: true, force: true });
  await syncLifecycleSkills(value.packageRoot, value.paths, { homeDir: value.home });
  expect((await lstat(link)).isSymbolicLink()).toBe(true);
});

test('removing one target excludes it from automatic discovery without removing another target', async () => {
  const value = await fixture();
  await mkdir(path.join(value.home, '.workbuddy', 'settings'), { recursive: true });
  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['codex'],
  });
  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['workbuddy'],
  });
  const result = await removeLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['codex'],
  });
  expect(result.removed).toEqual(['codex']);
  await expect(
    access(path.join(value.home, '.codex', 'skills', 'hithink-finance-test')),
  ).rejects.toMatchObject({ code: 'ENOENT' });
  expect(
    await access(path.join(value.home, '.workbuddy', 'skills', 'hithink-finance-test', 'SKILL.md')),
  ).toBeUndefined();
  const status = await readSkillsLifecycleStatus(value.packageRoot, value.paths, value.home);
  expect(status.strategy.excluded).toContain('codex');
});

test('migrates an unchanged legacy WorkBuddy copy to a managed shared link', async () => {
  const value = await fixture();
  const source = path.join(value.packageRoot, 'skills');
  const client = path.join(value.home, '.workbuddy');
  const target = path.join(client, 'skills');
  const legacy = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
  await cp(path.join(source, 'hithink-finance-test'), path.join(target, 'hithink-finance-test'), {
    recursive: true,
  });
  await writeFile(
    path.join(client, '.hithink-finance-cli-skills-manifest.json'),
    JSON.stringify(legacy),
  );

  const result = await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['workbuddy'],
  });

  expect(result.failures).toEqual([]);
  expect((await lstat(path.join(target, 'hithink-finance-test'))).isSymbolicLink()).toBe(true);
  await expect(
    access(path.join(client, '.hithink-finance-cli-skills-manifest.json')),
  ).rejects.toMatchObject({ code: 'ENOENT' });
});

test('keeps the prior shared content available when a new package tree fails manifest validation', async () => {
  const value = await fixture();
  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['codex'],
  });
  await writeFile(
    path.join(value.packageRoot, 'skills', 'hithink-finance-test', 'SKILL.md'),
    'incomplete-next',
  );

  await expect(
    syncLifecycleSkills(value.packageRoot, value.paths, { homeDir: value.home }),
  ).rejects.toThrow('Skills content does not match');
  expect(
    await readFile(
      path.join(value.paths.dataDir, 'skills', 'current', 'hithink-finance-test', 'SKILL.md'),
      'utf8',
    ),
  ).toBe('official-v1');
});

test('keeps a disabled strategy disabled for lifecycle synchronization and removes all auto-managed targets', async () => {
  const value = await fixture();
  await mkdir(path.join(value.home, '.workbuddy', 'settings'), { recursive: true });
  await syncLifecycleSkills(value.packageRoot, value.paths, { homeDir: value.home });
  const result = await removeLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
  });
  expect(result.removed).toEqual(['workbuddy']);
  await expect(
    access(path.join(value.home, '.workbuddy', 'skills', 'hithink-finance-test')),
  ).rejects.toMatchObject({ code: 'ENOENT' });

  const upgrade = await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    reactivate: false,
  });
  expect(upgrade.targets).toEqual([]);
  expect(
    (await readSkillsLifecycleStatus(value.packageRoot, value.paths, value.home)).strategy.mode,
  ).toBe('disabled');

  const manual = await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    reactivate: true,
  });
  expect(manual.failures).toEqual([]);
  expect(manual.targets.map((target) => target.name)).toEqual(['workbuddy']);
  expect(
    (await readSkillsLifecycleStatus(value.packageRoot, value.paths, value.home)).strategy,
  ).toMatchObject({ mode: 'auto', excluded: [] });
});

test('keeps auto mode while appending an explicit target and retains both managed targets for remove-all', async () => {
  const value = await fixture();
  await mkdir(path.join(value.home, '.workbuddy', 'settings'), { recursive: true });
  await syncLifecycleSkills(value.packageRoot, value.paths, { homeDir: value.home });
  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['codex'],
  });

  const status = await readSkillsLifecycleStatus(value.packageRoot, value.paths, value.home);
  expect(status.strategy).toMatchObject({ mode: 'auto', explicit: ['codex'] });
  expect(status.targets.map((target) => target.name)).toEqual(
    expect.arrayContaining(['codex', 'workbuddy']),
  );
  expect(
    (await removeLifecycleSkills(value.packageRoot, value.paths, { homeDir: value.home })).removed,
  ).toEqual(expect.arrayContaining(['codex', 'workbuddy']));
});

test('refuses an unknown copy target and reports a link ownership conflict in status', async () => {
  const value = await fixture();
  const skill = path.join(value.home, '.workbuddy', 'skills', 'hithink-finance-test');
  await mkdir(skill, { recursive: true });
  await writeFile(path.join(skill, 'SKILL.md'), 'user-owned');

  const copy = await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['workbuddy'],
    copy: true,
  });
  expect(copy.failures[0]).toMatchObject({ status: 'conflict' });
  expect(await readFile(path.join(skill, 'SKILL.md'), 'utf8')).toBe('user-owned');

  await rm(skill, { recursive: true, force: true });
  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['codex'],
  });
  const link = path.join(value.home, '.codex', 'skills', 'hithink-finance-test');
  await rm(link, { recursive: true, force: true });
  await mkdir(link, { recursive: true });
  const status = await readSkillsLifecycleStatus(value.packageRoot, value.paths, value.home);
  expect(status.targets.find((target) => target.name === 'codex')).toMatchObject({
    status: 'conflict',
    detail: expect.stringContaining('Expected a managed directory link'),
  });
});

test('refuses a nested link in a previously managed copy target', async () => {
  const value = await fixture();
  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['workbuddy'],
    copy: true,
  });
  const target = path.join(value.home, '.workbuddy', 'skills', 'hithink-finance-test');
  const outside = path.join(value.home, 'outside', 'hithink-finance-test');
  await mkdir(outside, { recursive: true });
  await writeFile(path.join(outside, 'SKILL.md'), 'outside');
  await rm(target, { recursive: true, force: true });
  await symlink(outside, target, process.platform === 'win32' ? 'junction' : 'dir');

  const result = await syncLifecycleSkills(value.packageRoot, value.paths, { homeDir: value.home });
  expect(result.failures[0]).toMatchObject({ name: 'workbuddy', status: 'failed' });
  expect(await readFile(path.join(outside, 'SKILL.md'), 'utf8')).toBe('outside');
  expect(
    (await readSkillsLifecycleStatus(value.packageRoot, value.paths, value.home)).targets.find(
      (targetStatus) => targetStatus.name === 'workbuddy',
    ),
  ).toMatchObject({ status: 'conflict' });
});

test('refuses to create a copy target through a linked Agent root', async () => {
  const value = await fixture();
  const outside = path.join(value.home, 'outside-workbuddy');
  await mkdir(outside, { recursive: true });
  await symlink(
    outside,
    path.join(value.home, '.workbuddy'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );

  const result = await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['workbuddy'],
    copy: true,
  });
  expect(result.failures[0]).toMatchObject({
    name: 'workbuddy',
    status: 'failed',
    detail: expect.stringContaining('symbolic link'),
  });
  await expect(access(path.join(outside, 'skills'))).rejects.toMatchObject({ code: 'ENOENT' });
});

test('reports a conflict when a managed link was replaced before removal', async () => {
  const value = await fixture();
  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['codex'],
  });
  const skill = path.join(value.home, '.codex', 'skills', 'hithink-finance-test');
  await rm(skill, { recursive: true, force: true });
  await mkdir(skill, { recursive: true });
  await writeFile(path.join(skill, 'SKILL.md'), 'user-owned');

  const result = await removeLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['codex'],
  });
  expect(result.removed).toEqual([]);
  expect(result.failures[0]).toMatchObject({ name: 'codex', status: 'conflict' });
  const status = await readSkillsLifecycleStatus(value.packageRoot, value.paths, value.home);
  expect(status.strategy.excluded).not.toContain('codex');
  expect(status.targets.find((target) => target.name === 'codex')).toMatchObject({
    status: 'conflict',
    detail: expect.stringContaining('Expected a managed directory link'),
  });
  expect(await readFile(path.join(skill, 'SKILL.md'), 'utf8')).toBe('user-owned');
});

test('preserves a modified managed copy when removing its target', async () => {
  const value = await fixture();
  await syncLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['workbuddy'],
    copy: true,
  });
  const file = path.join(value.home, '.workbuddy', 'skills', 'hithink-finance-test', 'SKILL.md');
  await writeFile(file, 'user-modified');

  const result = await removeLifecycleSkills(value.packageRoot, value.paths, {
    homeDir: value.home,
    agents: ['workbuddy'],
  });
  expect(result.removed).toEqual([]);
  expect(result.failures[0]).toMatchObject({ name: 'workbuddy', status: 'conflict' });
  expect(await readFile(file, 'utf8')).toBe('user-modified');
  expect(await readSkillsLifecycleStatus(value.packageRoot, value.paths, value.home)).toMatchObject(
    {
      targetsVerified: false,
      targetStatus: 'attention-required',
      targets: [expect.objectContaining({ name: 'workbuddy', status: 'conflict' })],
    },
  );
});
