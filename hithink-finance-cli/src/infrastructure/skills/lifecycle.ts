/**
 * Persistent, package-owned delivery of bundled Skills to supported Agents.
 *
 * Each Agent receives a directory link to one versioned shared content tree by
 * default. A target can explicitly opt into copied delivery when its client
 * cannot discover a directory link. The state file records only resources this
 * CLI owns, so unknown user files are never overwritten or removed.
 */

import {
  cp,
  lstat,
  mkdir,
  readFile,
  readlink,
  readdir,
  rename,
  rm,
  rmdir,
  stat,
  symlink,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { withExclusiveDataLock } from '../filesystem/process-lock.js';
import { writeJsonAtomic } from '../filesystem/atomic-file.js';
import {
  reconcileManagedSkills,
  removeManagedSkills,
  type ManagedSkillManifest,
} from './manifest.js';

export const supportedSkillAgents = [
  'codex',
  'claude-code',
  'cursor',
  'gemini-cli',
  'opencode',
  'github-copilot',
  'trae',
  'trae-cn',
  'workbuddy',
  'qclaw',
] as const;
export type SkillAgent = (typeof supportedSkillAgents)[number];
type Delivery = 'link' | 'copy';
type StrategyMode = 'auto' | 'specified' | 'disabled';

export interface SkillsLifecyclePaths {
  configDir: string;
  dataDir: string;
  stateDir: string;
}

interface TargetRecord {
  directory?: string;
  delivery: Delivery;
  /** Manifest from the last successful target sync; it defines our ownership boundary. */
  manifest?: ManagedSkillManifest;
}

interface LifecycleState {
  version: 1;
  mode: StrategyMode;
  explicit: SkillAgent[];
  excluded: SkillAgent[];
  targets: Partial<Record<SkillAgent, TargetRecord>>;
}

export interface LifecycleTargetStatus {
  name: SkillAgent;
  directory: string;
  delivery: Delivery;
  status: 'ready' | 'waiting' | 'missing' | 'conflict' | 'failed' | 'removed';
  detail?: string;
}

export interface LifecycleStatus {
  targetsVerified: boolean;
  targetStatus: 'ready' | 'attention-required' | 'not-verified';
  strategy: Pick<LifecycleState, 'mode' | 'explicit' | 'excluded'>;
  content: { directory: string; available: boolean; cliVersion: string };
  targets: LifecycleTargetStatus[];
}

export interface LifecycleSyncOptions {
  homeDir?: string;
  agents?: SkillAgent[];
  auto?: boolean;
  directory?: string;
  copy?: boolean;
  /** A user-invoked sync re-enables a previously disabled strategy. */
  reactivate?: boolean;
  /** Installation lifecycle variables replace rather than append the saved policy. */
  replace?: boolean;
}

export interface LifecycleRemoveOptions {
  homeDir?: string;
  agents?: SkillAgent[];
}

const STATE_FILE = 'skills-targets.json';
const CONTENT_DIRECTORY = 'skills';
const CURRENT_CONTENT = 'current';

function emptyState(): LifecycleState {
  return { version: 1, mode: 'auto', explicit: [], excluded: [], targets: {} };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function isSkillAgent(value: string): value is SkillAgent {
  return (supportedSkillAgents as readonly string[]).includes(value);
}

function assertAgentList(agents: readonly string[]): asserts agents is SkillAgent[] {
  const unknown = agents.filter((agent) => !isSkillAgent(agent));
  if (unknown.length > 0)
    throw new Error(
      `Unknown Agent target: ${unknown.join(', ')}. Available: ${supportedSkillAgents.join(', ')}.`,
    );
}

function stateFile(paths: SkillsLifecyclePaths): string {
  return path.join(paths.configDir, STATE_FILE);
}

function contentRoot(paths: SkillsLifecyclePaths): string {
  return path.join(paths.dataDir, CONTENT_DIRECTORY, CURRENT_CONTENT);
}

function isManagedManifest(value: unknown): value is ManagedSkillManifest {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<ManagedSkillManifest>;
  return (
    candidate.protocolVersion === '1' &&
    typeof candidate.cliVersion === 'string' &&
    candidate.files !== null &&
    typeof candidate.files === 'object' &&
    Object.entries(candidate.files).every(([relative, hash]) => {
      const segments = relative.split('/');
      return (
        !path.posix.isAbsolute(relative) &&
        !relative.includes('\\') &&
        segments.length >= 2 &&
        segments[0]?.startsWith('hithink-finance-') === true &&
        segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..') &&
        typeof hash === 'string' &&
        /^[a-f\d]{64}$/iu.test(hash)
      );
    })
  );
}

function asState(value: unknown): LifecycleState | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  const candidate = value as Partial<LifecycleState>;
  if (candidate.version !== 1 || !['auto', 'specified', 'disabled'].includes(candidate.mode ?? ''))
    return undefined;
  if (
    !Array.isArray(candidate.explicit) ||
    !Array.isArray(candidate.excluded) ||
    candidate.targets === null ||
    typeof candidate.targets !== 'object'
  )
    return undefined;
  if (
    ![...candidate.explicit, ...candidate.excluded].every(
      (agent) => typeof agent === 'string' && isSkillAgent(agent),
    )
  )
    return undefined;
  for (const [agent, record] of Object.entries(candidate.targets)) {
    if (!isSkillAgent(agent) || record === null || typeof record !== 'object') return undefined;
    const target = record as Partial<TargetRecord>;
    if (!['link', 'copy'].includes(target.delivery ?? '')) return undefined;
    if (target.manifest !== undefined && !isManagedManifest(target.manifest)) return undefined;
    if (
      target.directory !== undefined &&
      (typeof target.directory !== 'string' || !path.isAbsolute(target.directory))
    )
      return undefined;
  }
  return {
    version: 1,
    mode: candidate.mode as StrategyMode,
    explicit: unique(candidate.explicit as SkillAgent[]),
    excluded: unique(candidate.excluded as SkillAgent[]),
    targets: candidate.targets as LifecycleState['targets'],
  };
}

async function readState(paths: SkillsLifecyclePaths): Promise<LifecycleState> {
  try {
    const parsed = asState(JSON.parse(await readFile(stateFile(paths), 'utf8')));
    if (parsed === undefined) throw new Error('invalid Skills target state');
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyState();
    throw error;
  }
}

async function writeState(paths: SkillsLifecyclePaths, state: LifecycleState): Promise<void> {
  await writeJsonAtomic(stateFile(paths), state);
}

function clientRoot(agent: SkillAgent, homeDir: string): string {
  switch (agent) {
    case 'opencode':
      return process.platform === 'win32'
        ? path.join(process.env.APPDATA ?? path.join(homeDir, 'AppData', 'Roaming'), 'opencode')
        : path.join(homeDir, '.config', 'opencode');
    case 'codex':
      return path.join(homeDir, '.codex');
    case 'claude-code':
      return path.join(homeDir, '.claude');
    case 'cursor':
      return path.join(homeDir, '.cursor');
    case 'gemini-cli':
      return path.join(homeDir, '.gemini');
    case 'github-copilot':
      return path.join(homeDir, '.copilot');
    case 'trae':
      return path.join(homeDir, '.trae');
    case 'trae-cn':
      return path.join(homeDir, '.trae-cn');
    case 'workbuddy':
      return path.join(homeDir, '.workbuddy');
    case 'qclaw':
      return path.join(homeDir, '.qclaw');
  }
}

function defaultSkillsRoot(agent: SkillAgent, homeDir: string): string {
  return path.join(clientRoot(agent, homeDir), 'skills');
}

async function directoryExists(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) return false;
    throw error;
  }
}

/** A bare historical `skills` directory is not enough evidence for auto discovery. */
async function detected(agent: SkillAgent, homeDir: string): Promise<boolean> {
  const root = clientRoot(agent, homeDir);
  if (!(await directoryExists(root))) return false;
  const entries = await readdir(root);
  return entries.some((entry) => entry !== 'skills');
}

function selected(state: LifecycleState, detectedAgents: readonly SkillAgent[]): SkillAgent[] {
  if (state.mode === 'disabled') return [];
  const base = state.mode === 'auto' ? [...detectedAgents, ...state.explicit] : state.explicit;
  return unique(base).filter((agent) => !state.excluded.includes(agent));
}

function targetDirectory(state: LifecycleState, agent: SkillAgent, homeDir: string): string {
  return state.targets[agent]?.directory ?? defaultSkillsRoot(agent, homeDir);
}

async function readManifest(packageRoot: string): Promise<ManagedSkillManifest> {
  const value: unknown = JSON.parse(
    await readFile(path.join(packageRoot, 'skills', 'manifest.json'), 'utf8'),
  );
  if (!isManagedManifest(value)) throw new Error('Bundled Skills manifest is invalid.');
  return value;
}

async function verifyContent(root: string, manifest: ManagedSkillManifest): Promise<void> {
  for (const [relative, expected] of Object.entries(manifest.files)) {
    const content = await readFile(path.join(root, ...relative.split('/')));
    const actual = createHash('sha256')
      .update(content.toString('utf8').replaceAll('\r\n', '\n'))
      .digest('hex');
    if (actual !== expected)
      throw new Error(`Skills content does not match the bundled manifest: ${relative}`);
  }
}

async function legacyManifestMatches(
  root: string,
  manifest: ManagedSkillManifest,
): Promise<boolean> {
  try {
    for (const [relative, expected] of Object.entries(manifest.files)) {
      const content = await readFile(path.join(root, ...relative.split('/')));
      if (createHash('sha256').update(content).digest('hex') !== expected) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function assertDirectoryNotLink(directory: string): Promise<void> {
  try {
    if ((await lstat(directory)).isSymbolicLink())
      throw new Error(`Refusing to manage a Skills root through a symbolic link: ${directory}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

async function assertNoSymbolicLinks(root: string, relatives: Iterable<string>): Promise<void> {
  const candidates = new Set([root]);
  for (const relative of relatives) {
    let candidate = root;
    for (const segment of relative.split('/')) {
      candidate = path.join(candidate, segment);
      candidates.add(candidate);
    }
  }
  for (const candidate of candidates) {
    try {
      if ((await lstat(candidate)).isSymbolicLink())
        throw new Error(`Refusing to manage Skills through a symbolic link: ${candidate}`);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) continue;
      throw error;
    }
  }
}

async function assertTargetPathNotLinked(directory: string, trustedRoot: string): Promise<void> {
  const relative = path.relative(trustedRoot, directory);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new Error(`Skills target is outside its trusted root: ${directory}`);
  let candidate = trustedRoot;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    candidate = path.join(candidate, segment);
    try {
      if ((await lstat(candidate)).isSymbolicLink())
        throw new Error(`Refusing to manage Skills through a symbolic link: ${candidate}`);
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) continue;
      throw error;
    }
  }
}

async function linkOwnership(
  destination: string,
  source: string,
): Promise<'owned' | 'missing' | 'conflict'> {
  try {
    const info = await lstat(destination);
    if (!info.isSymbolicLink()) return 'conflict';
    const resolved = path.resolve(path.dirname(destination), await readlink(destination));
    return path.normalize(resolved) === path.normalize(source) ? 'owned' : 'conflict';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
    throw error;
  }
}

async function publishContent(
  packageRoot: string,
  paths: SkillsLifecyclePaths,
  manifest: ManagedSkillManifest,
): Promise<void> {
  const container = path.dirname(contentRoot(paths));
  const current = contentRoot(paths);
  const next = path.join(container, `.next-${process.pid}-${randomUUID()}`);
  const previous = path.join(container, `.previous-${process.pid}-${randomUUID()}`);
  await mkdir(container, { recursive: true });
  await cp(path.join(packageRoot, 'skills'), next, { recursive: true, force: false });
  try {
    await verifyContent(next, manifest);
    const hadCurrent = await directoryExists(current);
    if (hadCurrent) await rename(current, previous);
    try {
      await rename(next, current);
    } catch (error) {
      if (hadCurrent) await rename(previous, current).catch(() => undefined);
      throw error;
    }
    await verifyContent(current, manifest);
    await rm(previous, { recursive: true, force: true });
  } catch (error) {
    await rm(next, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }
}

async function removeOwnedLink(destination: string, source: string): Promise<boolean> {
  const ownership = await linkOwnership(destination, source);
  if (ownership === 'owned') {
    await rm(destination, { recursive: true, force: true });
  }
  return ownership !== 'conflict';
}

function legacyManifestFile(agent: SkillAgent, homeDir: string): string {
  return path.join(clientRoot(agent, homeDir), '.hithink-finance-cli-skills-manifest.json');
}

async function readLegacyManifest(
  agent: SkillAgent,
  homeDir: string,
): Promise<ManagedSkillManifest | undefined> {
  try {
    const value: unknown = JSON.parse(await readFile(legacyManifestFile(agent, homeDir), 'utf8'));
    if (!isManagedManifest(value))
      throw new Error(`Legacy Skills manifest is invalid for ${agent}.`);
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function removeEmptyLegacyDirectories(
  directory: string,
  manifest: ManagedSkillManifest,
): Promise<void> {
  const directories = new Set<string>();
  for (const relative of Object.keys(manifest.files)) {
    let parent = path.posix.dirname(relative);
    while (parent !== '.') {
      directories.add(parent);
      parent = path.posix.dirname(parent);
    }
  }
  for (const relative of [...directories].sort((left, right) => right.length - left.length))
    await rmdir(path.join(directory, ...relative.split('/'))).catch((error: unknown) => {
      if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes((error as NodeJS.ErrnoException).code ?? ''))
        throw error;
    });
}

/** Converts only a verified legacy WorkBuddy/QClaw copy into the new shared-link delivery. */
async function migrateLegacyCopy(
  agent: SkillAgent,
  homeDir: string,
  directory: string,
): Promise<'none' | 'migrated' | 'conflict'> {
  if (agent !== 'workbuddy' && agent !== 'qclaw') return 'none';
  const legacy = await readLegacyManifest(agent, homeDir);
  if (legacy === undefined) return 'none';
  await assertDirectoryNotLink(clientRoot(agent, homeDir));
  if (!(await legacyManifestMatches(directory, legacy))) return 'conflict';
  await removeManagedSkills(directory, legacy);
  await removeEmptyLegacyDirectories(directory, legacy);
  await rm(legacyManifestFile(agent, homeDir), { force: true });
  return 'migrated';
}

async function syncTarget(
  agent: SkillAgent,
  state: LifecycleState,
  homeDir: string,
  source: string,
  manifest: ManagedSkillManifest,
): Promise<{ status: LifecycleTargetStatus; record?: TargetRecord }> {
  const record = state.targets[agent] ?? { delivery: 'link' as const };
  const directory = targetDirectory(state, agent, homeDir);
  const trustedRoot = record.directory === undefined ? homeDir : path.parse(directory).root;
  try {
    await assertTargetPathNotLinked(directory, trustedRoot);
    await mkdir(directory, { recursive: true });
    await assertTargetPathNotLinked(directory, trustedRoot);
    if (record.delivery === 'copy') {
      const previous = record.manifest;
      const skillNames = unique(Object.keys(manifest.files).map((file) => file.split('/')[0]!));
      if (previous === undefined) {
        for (const name of skillNames) {
          try {
            await lstat(path.join(directory, name));
            return {
              status: {
                name: agent,
                directory,
                delivery: 'copy',
                status: 'conflict',
                detail: `User-owned path exists: ${path.join(directory, name)}`,
              },
            };
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
        }
      }
      await assertNoSymbolicLinks(directory, [
        ...Object.keys(manifest.files),
        ...Object.keys(previous?.files ?? {}),
      ]);
      await reconcileManagedSkills(source, directory, manifest, previous);
      await verifyContent(directory, manifest);
      return {
        status: { name: agent, directory, delivery: 'copy', status: 'ready' },
        record: { ...record, manifest },
      };
    }
    if ((await migrateLegacyCopy(agent, homeDir, directory)) === 'conflict')
      return {
        status: {
          name: agent,
          directory,
          delivery: 'link',
          status: 'conflict',
          detail:
            'Legacy CLI-managed copy has been modified; use --copy to retain it or resolve the conflict.',
        },
      };
    for (const name of unique(Object.keys(manifest.files).map((file) => file.split('/')[0]!))) {
      const destination = path.join(directory, name);
      const expected = path.join(source, name);
      const removed = await removeOwnedLink(destination, expected);
      if (!removed) {
        try {
          await lstat(destination);
          return {
            status: {
              name: agent,
              directory,
              delivery: 'link',
              status: 'conflict',
              detail: `User-owned path exists: ${destination}`,
            },
          };
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }
      await symlink(expected, destination, process.platform === 'win32' ? 'junction' : 'dir');
    }
    await verifyContent(directory, manifest);
    return {
      status: { name: agent, directory, delivery: 'link', status: 'ready' },
      record: { ...record, manifest },
    };
  } catch (error) {
    return {
      status: {
        name: agent,
        directory,
        delivery: record.delivery,
        status: 'failed',
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function verifyTarget(
  directory: string,
  delivery: Delivery,
  source: string,
  manifest: ManagedSkillManifest,
): Promise<void> {
  if (delivery === 'link') {
    for (const name of unique(Object.keys(manifest.files).map((file) => file.split('/')[0]!))) {
      const destination = path.join(directory, name);
      const info = await lstat(destination);
      if (!info.isSymbolicLink())
        throw new Error(`Expected a managed directory link: ${destination}`);
      const resolved = path.resolve(path.dirname(destination), await readlink(destination));
      if (path.normalize(resolved) !== path.normalize(path.join(source, name)))
        throw new Error(`Managed directory link points to unexpected content: ${destination}`);
    }
  } else {
    await assertNoSymbolicLinks(directory, Object.keys(manifest.files));
  }
  await verifyContent(directory, manifest);
}

function applySyncOptions(state: LifecycleState, options: LifecycleSyncOptions): LifecycleState {
  const agents = options.agents ?? [];
  const wasDisabled = state.mode === 'disabled';
  assertAgentList(agents);
  if (options.auto === true && agents.length > 0)
    throw new Error('auto cannot be combined with named Agent targets.');
  if (
    options.directory !== undefined &&
    (agents.length !== 1 || options.auto === true || !path.isAbsolute(options.directory))
  )
    throw new Error('--directory requires exactly one named Agent and an absolute path.');
  if (options.copy === true && agents.length === 0)
    throw new Error('--copy requires one or more named Agent targets.');
  if (options.replace === true) {
    state.mode = options.auto === true ? 'auto' : 'specified';
    state.explicit = agents;
    state.excluded = [];
  } else if (options.auto === true || (options.reactivate === true && wasDisabled)) {
    state.mode = 'auto';
    if (options.reactivate === true && wasDisabled && agents.length === 0) state.excluded = [];
  }
  if (agents.length > 0) {
    if (state.mode !== 'auto') state.mode = 'specified';
    state.explicit = options.replace === true ? agents : unique([...state.explicit, ...agents]);
    state.excluded = state.excluded.filter((agent) => !agents.includes(agent));
    for (const agent of agents)
      state.targets[agent] = {
        ...(state.targets[agent] ?? { delivery: 'link' }),
        ...(options.directory === undefined ? {} : { directory: options.directory }),
        ...(options.copy === true ? { delivery: 'copy' } : {}),
      };
  }
  return state;
}

export async function syncLifecycleSkills(
  packageRoot: string,
  paths: SkillsLifecyclePaths,
  options: LifecycleSyncOptions = {},
): Promise<{ targets: LifecycleTargetStatus[]; failures: LifecycleTargetStatus[] }> {
  const homeDir = options.homeDir ?? os.homedir();
  await mkdir(paths.stateDir, { recursive: true });
  const manifest = await readManifest(packageRoot);
  return withExclusiveDataLock(
    path.join(paths.stateDir, 'skills-sync.lock'),
    { command: 'skills.sync', cliVersion: manifest.cliVersion },
    async () => {
      const state = applySyncOptions(await readState(paths), options);
      const detectedAgents = (
        await Promise.all(
          supportedSkillAgents.map(async (agent) =>
            (await detected(agent, homeDir)) ? agent : undefined,
          ),
        )
      ).filter((agent): agent is SkillAgent => agent !== undefined);
      const agents = selected(state, detectedAgents);
      if (agents.length === 0) {
        await writeState(paths, state);
        return { targets: [], failures: [] };
      }
      await publishContent(packageRoot, paths, manifest);
      const source = contentRoot(paths);
      const targets: LifecycleTargetStatus[] = [];
      for (const agent of agents) {
        const result = await syncTarget(agent, state, homeDir, source, manifest);
        targets.push(result.status);
        if (result.status.status === 'ready' && result.record !== undefined)
          state.targets[agent] = result.record;
      }
      await writeState(paths, state);
      return { targets, failures: targets.filter((target) => target.status !== 'ready') };
    },
  );
}

export async function removeLifecycleSkills(
  packageRoot: string,
  paths: SkillsLifecyclePaths,
  options: LifecycleRemoveOptions = {},
): Promise<{ removed: SkillAgent[]; failures: LifecycleTargetStatus[] }> {
  const homeDir = options.homeDir ?? os.homedir();
  const manifest = await readManifest(packageRoot);
  await mkdir(paths.stateDir, { recursive: true });
  return withExclusiveDataLock(
    path.join(paths.stateDir, 'skills-sync.lock'),
    { command: 'skills.remove', cliVersion: manifest.cliVersion },
    async () => {
      const state = await readState(paths);
      const detectedAgents = (
        await Promise.all(
          supportedSkillAgents.map(async (agent) =>
            (await detected(agent, homeDir)) ? agent : undefined,
          ),
        )
      ).filter((agent): agent is SkillAgent => agent !== undefined);
      const agents =
        options.agents ??
        unique([
          ...Object.keys(state.targets).filter(isSkillAgent),
          ...selected(state, detectedAgents),
        ]);
      assertAgentList(agents);
      const removed: SkillAgent[] = [];
      const failures: LifecycleTargetStatus[] = [];
      for (const agent of agents) {
        const record = state.targets[agent];
        if (record === undefined) continue;
        const directory = targetDirectory(state, agent, homeDir);
        if (record.manifest === undefined) {
          failures.push({
            name: agent,
            directory,
            delivery: record.delivery,
            status: 'conflict',
            detail:
              'The target has no CLI-managed ownership manifest; existing content is preserved.',
          });
          continue;
        }
        try {
          const trustedRoot = record.directory === undefined ? homeDir : path.parse(directory).root;
          await assertTargetPathNotLinked(directory, trustedRoot);
          if (record.delivery === 'copy') {
            await assertNoSymbolicLinks(directory, Object.keys(record.manifest.files));
            if (!(await legacyManifestMatches(directory, record.manifest))) {
              failures.push({
                name: agent,
                directory,
                delivery: record.delivery,
                status: 'conflict',
                detail: 'CLI-managed copy was modified; existing content is preserved.',
              });
              continue;
            }
            await removeManagedSkills(directory, record.manifest);
            await removeEmptyLegacyDirectories(directory, record.manifest);
          } else {
            const names = unique(
              Object.keys(record.manifest.files).map((file) => file.split('/')[0]!),
            );
            const conflict = (
              await Promise.all(
                names.map(async (name) => {
                  const destination = path.join(directory, name);
                  return {
                    destination,
                    ownership: await linkOwnership(
                      destination,
                      path.join(contentRoot(paths), name),
                    ),
                  };
                }),
              )
            ).find((result) => result.ownership === 'conflict');
            if (conflict !== undefined) {
              failures.push({
                name: agent,
                directory,
                delivery: record.delivery,
                status: 'conflict',
                detail: `User-owned path exists: ${conflict.destination}`,
              });
              continue;
            }
            for (const name of names)
              await removeOwnedLink(
                path.join(directory, name),
                path.join(contentRoot(paths), name),
              );
          }
          removed.push(agent);
          state.excluded = unique([...state.excluded, agent]);
          delete state.targets[agent];
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          failures.push({
            name: agent,
            directory,
            delivery: record.delivery,
            status: /symbolic link|unexpected content/iu.test(detail) ? 'conflict' : 'failed',
            detail,
          });
        }
      }
      if (options.agents === undefined) state.mode = 'disabled';
      await writeState(paths, state);
      return { removed, failures };
    },
  );
}

export async function readSkillsLifecycleStatus(
  packageRoot: string,
  paths: SkillsLifecyclePaths,
  homeDir = os.homedir(),
): Promise<LifecycleStatus> {
  const state = await readState(paths);
  const manifest = await readManifest(packageRoot);
  const content = contentRoot(paths);
  const available = await directoryExists(content);
  const detectedAgents = (
    await Promise.all(
      supportedSkillAgents.map(async (agent) =>
        (await detected(agent, homeDir)) ? agent : undefined,
      ),
    )
  ).filter((agent): agent is SkillAgent => agent !== undefined);
  const names = unique([
    ...selected(state, detectedAgents),
    ...Object.keys(state.targets).filter(isSkillAgent),
    ...state.excluded,
  ]);
  const targets: LifecycleTargetStatus[] = [];
  for (const name of names) {
    const directory = targetDirectory(state, name, homeDir);
    const delivery = state.targets[name]?.delivery ?? 'link';
    if (state.excluded.includes(name)) {
      targets.push({ name, directory, delivery, status: 'removed' });
      continue;
    }
    if (state.targets[name]?.manifest === undefined) {
      targets.push({
        name,
        directory,
        delivery,
        status: 'conflict',
        detail: 'The target has no CLI-managed ownership manifest; existing content is preserved.',
      });
      continue;
    }
    try {
      const trustedRoot =
        state.targets[name]?.directory === undefined ? homeDir : path.parse(directory).root;
      await assertTargetPathNotLinked(directory, trustedRoot);
      await verifyTarget(directory, delivery, content, manifest);
      targets.push({ name, directory, delivery, status: 'ready' });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const conflict =
        /managed directory link|symbolic link|unexpected content|does not match (?:the bundled )?manifest/iu.test(
          detail,
        );
      targets.push({
        name,
        directory,
        delivery,
        status: conflict ? 'conflict' : available ? 'missing' : 'waiting',
        detail,
      });
    }
  }
  const targetsVerified =
    targets.length > 0 && targets.every((target) => target.status === 'ready');
  return {
    targetsVerified,
    targetStatus:
      targets.length === 0 ? 'not-verified' : targetsVerified ? 'ready' : 'attention-required',
    strategy: { mode: state.mode, explicit: state.explicit, excluded: state.excluded },
    content: { directory: content, available, cliVersion: manifest.cliVersion },
    targets,
  };
}
