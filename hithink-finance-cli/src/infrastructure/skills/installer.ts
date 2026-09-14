/**
 * Agent Skills 安装与卸载模块
 *
 * 管理 AI Agent 扩展技能包的安装、同步和卸载操作。
 * 技能包是预置的金融数据分析工具集，通过 skills CLI 工具进行全局安装。
 *
 * 技能包分类：
 * - hithink-finance-shared：共享基础工具
 * - hithink-finance-symbol：股票代码/名称查询
 * - hithink-finance-market：行情/市场数据
 * - hithink-finance-special-data：特殊数据（龙虎榜、涨停板等）
 * - hithink-finance-financials：财务报表分析
 * - hithink-finance-index：指数数据
 * - hithink-finance-futures：期货数据
 * - hithink-finance-options：期权数据
 * - hithink-finance-data：通用数据查询
 * - hithink-finance-research：研报查询
 *
 * 实现方式：通过 spawn 子进程调用 `skills` CLI 适配标准 Agent，随后把同一份
 * package manifest 同步到已安装 WorkBuddy/QClaw 的专属发现目录。
 *
 * @module skills/installer
 */

import { createHash } from 'node:crypto';
import { lstat, readFile, rename, rm, rmdir, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeJsonAtomic } from '../filesystem/atomic-file.js';
import { createPlatformPaths } from '../filesystem/platform-paths.js';
import {
  reconcileManagedSkills,
  removeManagedSkills,
  type ManagedSkillManifest,
} from './manifest.js';
import {
  supportedSkillAgents,
  removeLifecycleSkills,
  syncLifecycleSkills,
  type LifecycleSyncOptions,
  type SkillAgent,
} from './lifecycle.js';

const DEDICATED_MANIFEST = '.hithink-finance-cli-skills-manifest.json';

export interface DedicatedSkillTarget {
  name: 'workbuddy' | 'qclaw';
  clientRoot: string;
  skillsRoot: string;
  manifestFile: string;
}

const dedicatedClients: ReadonlyArray<{
  name: DedicatedSkillTarget['name'];
  directory: string;
}> = [
  { name: 'workbuddy', directory: '.workbuddy' },
  { name: 'qclaw', directory: '.qclaw' },
];

async function isDirectory(directory: string): Promise<boolean> {
  try {
    return (await stat(directory)).isDirectory();
  } catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) return false;
    throw error;
  }
}

/** Returns dedicated Skill targets only for clients already installed in the user's home. */
export async function dedicatedSkillTargets(
  homeDir = os.homedir(),
): Promise<DedicatedSkillTarget[]> {
  const targets: DedicatedSkillTarget[] = [];
  for (const client of dedicatedClients) {
    const clientRoot = path.join(homeDir, client.directory);
    if (!(await isDirectory(clientRoot))) continue;
    targets.push({
      name: client.name,
      clientRoot,
      skillsRoot: path.join(clientRoot, 'skills'),
      manifestFile: path.join(clientRoot, DEDICATED_MANIFEST),
    });
  }
  return targets;
}

function isManagedSkillManifest(value: unknown): value is ManagedSkillManifest {
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

async function readManifest(file: string): Promise<ManagedSkillManifest> {
  const value: unknown = JSON.parse(await readFile(file, 'utf8'));
  if (!isManagedSkillManifest(value)) throw new Error(`Invalid managed Skills manifest: ${file}`);
  return value;
}

async function readOptionalManifest(file: string): Promise<ManagedSkillManifest | undefined> {
  try {
    return await readManifest(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function inspectRepairableManifest(
  file: string,
): Promise<{ manifest?: ManagedSkillManifest; invalid?: true }> {
  try {
    const manifest = await readOptionalManifest(file);
    return manifest === undefined ? {} : { manifest };
  } catch (error) {
    if (
      !(error instanceof SyntaxError) &&
      !(error instanceof Error && error.message.startsWith('Invalid managed Skills manifest:'))
    )
      throw error;
    return { invalid: true };
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

async function verifyManagedFiles(
  skillsRoot: string,
  manifest: ManagedSkillManifest,
): Promise<void> {
  const drifted: string[] = [];
  for (const [relative, expectedHash] of Object.entries(manifest.files)) {
    try {
      const content = await readFile(path.join(skillsRoot, ...relative.split('/')));
      const actualHash = createHash('sha256').update(content).digest('hex');
      if (actualHash !== expectedHash) drifted.push(relative);
    } catch {
      drifted.push(relative);
    }
  }
  if (drifted.length > 0)
    throw new Error(`Managed Skill verification failed for ${drifted.length} file(s).`);
}

async function removeEmptyManagedDirectories(
  skillsRoot: string,
  manifest: ManagedSkillManifest,
): Promise<void> {
  const directories = new Set<string>();
  for (const relative of Object.keys(manifest.files)) {
    let directory = path.posix.dirname(relative);
    while (directory !== '.') {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  for (const relative of [...directories].sort((left, right) => right.length - left.length)) {
    try {
      await rmdir(path.join(skillsRoot, ...relative.split('/')));
    } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes((error as NodeJS.ErrnoException).code ?? ''))
        throw error;
    }
  }
}

/** Synchronizes package-owned Skills into WorkBuddy and QClaw dedicated discovery paths. */
export async function syncDedicatedSkills(
  packageRoot: string,
  homeDir = os.homedir(),
): Promise<{ targets: DedicatedSkillTarget[]; backups: string[] }> {
  const source = path.join(packageRoot, 'skills');
  const next = await readManifest(path.join(source, 'manifest.json'));
  const targets = await dedicatedSkillTargets(homeDir);
  const backups: string[] = [];

  for (const target of targets) {
    await assertNoSymbolicLinks(target.clientRoot, [DEDICATED_MANIFEST, 'skills']);
    const previous = await inspectRepairableManifest(target.manifestFile);
    const managedPaths = new Set([
      ...Object.keys(next.files),
      ...Object.keys(previous.manifest?.files ?? {}),
    ]);
    await assertNoSymbolicLinks(target.clientRoot, [
      DEDICATED_MANIFEST,
      'skills',
      ...[...managedPaths].map((relative) => `skills/${relative}`),
    ]);
    if (previous.invalid === true) {
      const backup = `${target.manifestFile}.invalid-${Date.now()}`;
      await rename(target.manifestFile, backup);
      backups.push(backup);
    }
    const result = await reconcileManagedSkills(
      source,
      target.skillsRoot,
      next,
      previous.manifest ?? next,
    );
    backups.push(...result.backups);
    await verifyManagedFiles(target.skillsRoot, next);
    await writeJsonAtomic(target.manifestFile, next);
  }
  return { targets, backups };
}

/** Removes only files recorded as CLI-managed from dedicated discovery paths. */
export async function removeDedicatedSkills(
  homeDir = os.homedir(),
): Promise<{ targets: DedicatedSkillTarget[] }> {
  const targets = await dedicatedSkillTargets(homeDir);
  const removedTargets: DedicatedSkillTarget[] = [];
  for (const target of targets) {
    const managed = await readOptionalManifest(target.manifestFile);
    if (managed === undefined) continue;
    await assertNoSymbolicLinks(target.clientRoot, [
      DEDICATED_MANIFEST,
      'skills',
      ...Object.keys(managed.files).map((relative) => `skills/${relative}`),
    ]);
    await removeManagedSkills(target.skillsRoot, managed);
    await removeEmptyManagedDirectories(target.skillsRoot, managed);
    await rm(target.manifestFile, { force: true });
    removedTargets.push(target);
  }
  return { targets: removedTargets };
}

/**
 * 同步（安装/更新）所有预置技能包
 *
 * 调用 `skills add <source> --global --copy --all --full-depth` 将
 * 技能源目录下的所有技能安装到全局位置。
 *
 * @param packageRoot - npm 包的根路径（包含 node_modules 和 skills 目录）
 * @returns 子进程退出码 { code: number }
 */
export async function syncSkills(
  packageRoot: string,
  signal?: AbortSignal,
  options: Omit<LifecycleSyncOptions, 'homeDir' | 'replace'> = {},
): Promise<{ code: number; targets: string[]; backupCount: number }> {
  if (signal?.aborted) return { code: 1, targets: [], backupCount: 0 };
  try {
    const lifecycle = await syncLifecycleSkills(packageRoot, createPlatformPaths(), {
      ...environmentSkillSelection(process.env),
      ...options,
      ...(options.reactivate === undefined && process.env.HITHINK_FINANCE_SKILLS_INSTALL === '1'
        ? { reactivate: false }
        : {}),
    });
    return {
      code: lifecycle.failures.length === 0 ? 0 : 1,
      targets: lifecycle.targets.map((target) => target.name),
      backupCount: 0,
    };
  } catch (error) {
    process.stderr.write(
      `hithink-finance: Skill synchronization failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return {
      code: 1,
      targets: [],
      backupCount: 0,
    };
  }
}

/**
 * 卸载所有预置技能包
 *
 * 调用 `skills remove <names...> --global --yes` 删除所有已安装的技能。
 *
 * @param packageRoot - npm 包的根路径
 * @returns 子进程退出码 { code: number }
 */
export async function removeSkills(
  packageRoot: string,
  signal?: AbortSignal,
  agents?: SkillAgent[],
): Promise<{ code: number; targets: string[] }> {
  if (signal?.aborted) return { code: 1, targets: [] };
  try {
    const lifecycle = await removeLifecycleSkills(packageRoot, createPlatformPaths(), {
      ...(agents === undefined ? {} : { agents }),
    });
    return {
      code: lifecycle.failures.length === 0 ? 0 : 1,
      targets: lifecycle.removed,
    };
  } catch (error) {
    process.stderr.write(
      `hithink-finance: Skill removal failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return { code: 1, targets: [] };
  }
}

/**
 * 启动子进程运行 skills CLI 命令
 *
 * 子进程配置：
 * - stdio：忽略 stdin，pipe stdout/stderr
 * - windowsHide：Windows 上隐藏控制台窗口
 * - 监听 'error'（进程启动失败）和 'exit'（进程结束）事件
 *
 * @param invocation - CLI 调用参数
 * @returns Promise 包装的子进程退出码
 */
export function environmentSkillSelection(
  env: NodeJS.ProcessEnv,
): Pick<LifecycleSyncOptions, 'agents' | 'auto' | 'replace'> {
  const raw = env.HITHINK_FINANCE_SKILLS_AGENTS;
  if (raw === undefined) return {};
  const values = raw.split(',').map((value) => value.trim());
  if (values.length === 0 || values.some((value) => value === ''))
    throw new Error(
      'HITHINK_FINANCE_SKILLS_AGENTS must be auto or a non-empty comma-separated Agent list.',
    );
  if (values.includes('auto')) {
    if (values.length !== 1)
      throw new Error('HITHINK_FINANCE_SKILLS_AGENTS=auto cannot be combined with named Agents.');
    return { auto: true, replace: true };
  }
  const unknown = values.filter(
    (value) => !(supportedSkillAgents as readonly string[]).includes(value),
  );
  if (unknown.length > 0)
    throw new Error(
      `Unknown HITHINK_FINANCE_SKILLS_AGENTS value: ${unknown.join(', ')}. Available: ${supportedSkillAgents.join(', ')}.`,
    );
  return { agents: values as SkillAgent[], replace: true };
}

/**
 * 所有预置技能的名称列表
 *
 * 每个技能对应一个 skill 包，涵盖金融数据分析的不同领域。
 */
const skillNames = [
  'hithink-finance-shared',
  'hithink-finance-symbol',
  'hithink-finance-market',
  'hithink-finance-special-data',
  'hithink-finance-financials',
  'hithink-finance-index',
  'hithink-finance-fund',
  'hithink-finance-futures',
  'hithink-finance-options',
  'hithink-finance-valuation',
  'hithink-finance-data',
  'hithink-finance-research',
];

/**
 * 构造技能移除命令参数
 *
 * 命令格式：
 * `node <cli.mjs> remove <skill1> <skill2> ... --global --yes`
 *
 * --global：全局范围移除
 * 不指定 --agent 时，skills CLI 会遍历所有 agent 目标。
 * --yes：跳过确认提示
 *
 * @param packageRoot - npm 包的根路径
 * @returns CLI 调用的命令、参数和环境变量
 */
export function skillsRemoveArguments(packageRoot: string): ReturnType<typeof skillsCliArguments> {
  // skills CLI 入口脚本路径
  const cli = path.join(packageRoot, 'node_modules', 'skills', 'bin', 'cli.mjs');
  return {
    command: process.execPath,
    args: [cli, 'remove', ...skillNames, '--global', '--yes'],
    // 禁用遥测数据上报
    env: { ...process.env, DISABLE_TELEMETRY: '1' },
  };
}

/**
 * 构造技能安装命令参数
 *
 * 命令格式：
 * `node <cli.mjs> add <source> --global --copy --all --full-depth`
 *
 * --global：全局范围安装
 * --copy：复制文件（而非创建符号链接）
 * --all：安装所有技能
 * --full-depth：完全深度导航
 *
 * @param packageRoot - npm 包的根路径
 * @returns CLI 调用的命令、参数和环境变量
 */
export function skillsCliArguments(packageRoot: string): {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
} {
  // skills CLI 入口脚本路径
  const cli = path.join(packageRoot, 'node_modules', 'skills', 'bin', 'cli.mjs');
  // 技能源文件目录（相对于 packageRoot 的 skills 目录）
  const source = path.join(packageRoot, 'skills');
  return {
    command: process.execPath,
    args: [cli, 'add', source, '--global', '--copy', '--all', '--full-depth'],
    // 禁用遥测数据上报
    env: { ...process.env, DISABLE_TELEMETRY: '1' },
  };
}
