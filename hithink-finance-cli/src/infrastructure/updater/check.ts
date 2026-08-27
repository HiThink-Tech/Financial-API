/**
 * 更新检查模块
 *
 * 提供版本更新检查的辅助功能：读取缓存状态和调度后台检查任务。
 *
 * 后台检查机制：
 * 通过 spawn 创建完全分离的子进程运行检查脚本，主进程不等待子进程完成。
 * 使用 `detached: true` + `child.unref()` 确保子进程：
 * - 不受父进程退出影响（detached）
 * - 不阻止父进程退出（unref）
 * - 不占用父进程的事件循环
 *
 * 这种方式可以避免阻塞 CLI 命令的正常执行，将耗时的网络检查放到后台完成。
 *
 * @module updater/check
 */

import { randomUUID } from 'node:crypto';
import { link, mkdir, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import type { UpdateCacheState } from './cache.js';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { updateCacheDecision, updatePromptDecision } from './cache.js';

/**
 * 从缓存文件读取更新检查状态
 *
 * 如果文件不存在或 JSON 解析失败，返回 undefined（视为无缓存）。
 *
 * @param file - 缓存文件路径
 * @returns 解析后的缓存状态，读取失败返回 undefined
 */
export async function readUpdateCache(file: string): Promise<UpdateCacheState | undefined> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as UpdateCacheState;
  } catch {
    // 文件不存在或 JSON 格式错误 → 视为无缓存
    return undefined;
  }
}

async function writeUpdateCache(file: string, state: UpdateCacheState): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

/**
 * 调度后台更新检查任务
 *
 * 以完全分离的子进程方式运行更新检查脚本（scripts/update-check.mjs）：
 * - `detached: true`：子进程与父进程分离，成为独立进程组
 * - `stdio: 'ignore'`：忽略标准输入输出（后台静默运行）
 * - `windowsHide: true`：Windows 上不显示控制台窗口
 * - `child.unref()`：父进程可以独立退出，不等待子进程
 *
 * @param packageRoot - npm 包的根路径
 * @param packageName - 要检查更新的 npm 包名
 * @param cacheFile - 更新缓存文件的路径
 */
const UPDATE_CHECK_LEASE_TTL_MS = 5 * 60_000;

export interface UpdateCheckLease {
  path: string;
  pid: number;
  startedAt: number;
  token: string;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function inspectUpdateCheckLease(
  leasePath: string,
  now: () => number,
): Promise<{ lease?: UpdateCheckLease; stale: boolean }> {
  try {
    const lease = JSON.parse(await readFile(leasePath, 'utf8')) as UpdateCheckLease;
    const valid =
      typeof lease.pid === 'number' &&
      typeof lease.startedAt === 'number' &&
      typeof lease.token === 'string';
    if (valid)
      return {
        lease,
        stale: now() - lease.startedAt >= UPDATE_CHECK_LEASE_TTL_MS || !processAlive(lease.pid),
      };
  } catch {
    // Inspect the age below. A publishing owner never exposes a partial lease.
  }
  try {
    const leaseStats = await stat(leasePath);
    return { stale: now() - leaseStats.mtimeMs >= UPDATE_CHECK_LEASE_TTL_MS };
  } catch {
    return { stale: false };
  }
}

export async function releaseUpdateCheckLease(lease: UpdateCheckLease): Promise<void> {
  try {
    const current = JSON.parse(await readFile(lease.path, 'utf8')) as { token?: string };
    if (current.token === lease.token) await rm(lease.path, { force: true });
  } catch {
    // Lease cleanup is advisory and must never affect the caller.
  }
}

export async function acquireUpdateCheckLease(
  cacheFile: string,
  options: { now?: () => number; retry?: boolean } = {},
): Promise<UpdateCheckLease | undefined> {
  const leasePath = path.join(path.dirname(cacheFile), 'update-check.lock');
  const now = options.now ?? Date.now;
  await mkdir(path.dirname(leasePath), { recursive: true });
  const lease: UpdateCheckLease = {
    path: leasePath,
    pid: process.pid,
    startedAt: now(),
    token: randomUUID(),
  };
  const candidatePath = `${leasePath}.${process.pid}.${lease.token}.candidate`;
  let acquired = false;
  try {
    await writeFile(candidatePath, `${JSON.stringify(lease)}\n`, { flag: 'wx', mode: 0o600 });
    await link(candidatePath, leasePath);
    acquired = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') return undefined;
  } finally {
    await rm(candidatePath, { force: true });
  }
  if (acquired) return lease;

  const observed = await inspectUpdateCheckLease(leasePath, now);
  if (!observed.stale || options.retry === false) return undefined;

  const reclaimPath = `${leasePath}.reclaim`;
  let reclaimHandle;
  try {
    reclaimHandle = await open(reclaimPath, 'wx', 0o600);
  } catch {
    return undefined;
  }
  try {
    const current = await inspectUpdateCheckLease(leasePath, now);
    if (!current.stale) return undefined;
    if (current.lease === undefined) await rm(leasePath, { force: true });
    else await releaseUpdateCheckLease({ ...current.lease, path: leasePath });
  } finally {
    await reclaimHandle.close();
    await rm(reclaimPath, { force: true });
  }
  return acquireUpdateCheckLease(cacheFile, { now, retry: false });
}

export async function scheduleUpdateCheck(
  packageRoot: string,
  packageName: string,
  cacheFile: string,
): Promise<boolean> {
  const lease = await acquireUpdateCheckLease(cacheFile);
  if (lease === undefined) return false;
  let child;
  try {
    child = spawn(
      process.execPath,
      [
        path.join(packageRoot, 'scripts', 'update-check.mjs'),
        packageName,
        cacheFile,
        lease.path,
        lease.token,
      ],
      { detached: true, stdio: 'ignore', windowsHide: true, env: process.env },
    );
  } catch {
    await releaseUpdateCheckLease(lease);
    return false;
  }
  child.once('error', () => void releaseUpdateCheckLease(lease));
  // 解除父进程对子进程的引用，使父进程可以独立退出
  child.unref();
  return true;
}

export interface UpdateNoticeOptions {
  packageRoot: string;
  packageName: string;
  currentVersion: string;
  cacheFile: string;
  stderr: NodeJS.WriteStream;
  disabled?: boolean;
}

export async function maybeEmitCachedUpdateNotice(options: UpdateNoticeOptions): Promise<void> {
  try {
    const cached = await readUpdateCache(options.cacheFile);
    const now = Date.now();
    const disabled = options.disabled === true;
    const decision = updateCacheDecision(cached, now, disabled);
    if (decision === 'refresh') {
      await scheduleUpdateCheck(options.packageRoot, options.packageName, options.cacheFile);
    }

    if (
      cached === undefined ||
      cached.latestVersion === undefined ||
      updatePromptDecision(cached, options.currentVersion, now, disabled) !== 'prompt'
    )
      return;
    const latestVersion = cached.latestVersion;

    options.stderr.write(
      `[update] A newer hithink-finance CLI version is available: ${latestVersion} ` +
        `(current ${options.currentVersion}).\n` +
        'Run `hithink-finance update --check --format json` to inspect it; ' +
        'run `hithink-finance update --repair` to update after confirmation.\n',
    );
    await writeUpdateCache(options.cacheFile, {
      ...cached,
      promptedAt: now,
      promptedCurrentVersion: options.currentVersion,
      promptedLatestVersion: latestVersion,
    });
  } catch {
    // Update checks are advisory; failures must not affect the main command.
  }
}
