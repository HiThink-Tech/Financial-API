/**
 * 进程互斥锁模块
 *
 * 提供基于文件锁的进程级排他锁，确保同一时间只有一个进程可以操作数据库。
 * 使用 O_EXCL（排他创建）文件锁策略：
 *
 * 1. 创建锁文件（排他模式 `wx`）→ 成功获得锁
 * 2. 创建失败 → 读取现有锁文件中的 PID
 * 3. 检查 PID 进程是否存活：
 *    - 进程已死 → 清理残留锁文件并重试获取锁
 *    - 进程存活 → 抛出错误，拒绝并发操作
 * 4. 执行受保护的操作
 * 5. finally 块中清理锁文件
 *
 * 锁文件内容包含进程元数据，方便人工排错：
 * - pid：持有锁的进程 ID
 * - host：主机名（多机共享文件系统场景）
 * - command：执行的命令名
 * - startedAt：锁获取时间
 * - cliVersion：CLI 版本
 *
 * @module filesystem/process-lock
 */

import { hostname } from 'node:os';
import { open, readFile, rm } from 'node:fs/promises';
import { CliError } from '../../contracts/errors.js';

/**
 * 锁文件的元数据信息
 *
 * 存储在锁文件中的诊断信息，用于人工排查锁冲突。
 */
export interface LockMetadata {
  /** 执行的操作命令名 */
  command: string;
  /** CLI 工具版本号 */
  cliVersion: string;
}

/**
 * 检查指定 PID 的进程是否仍在运行
 *
 * 使用 `process.kill(pid, 0)` 发送信号 0 检测进程状态：
 * - 信号 0 不实际发送信号，仅检测进程是否存在
 * - 返回 true 表示进程存活
 * - 抛出异常（ESRCH 等）表示进程不存在或无权限
 *
 * @param pid - 要检查的进程 ID
 * @returns 进程是否存活
 */
function alive(pid: number): boolean {
  try {
    // 信号 0 不发送实际信号，仅做权限检查和存在性判断
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取排他数据锁后执行操作
 *
 * 锁的作用域仅限于当前函数调用，操作完成后（无论成功或失败）自动释放锁。
 * 支持自动检测并清理僵尸锁（已死进程遗留的锁文件）。
 *
 * @param lockPath - 锁文件的完整路径
 * @param metadata - 锁元数据（用于诊断）
 * @param action - 受锁保护的操作函数
 * @returns 操作函数的返回值
 * @throws 锁已被其他进程持有时抛出错误
 *
 * @example
 * ```typescript
 * await withExclusiveDataLock('/path/to/.lock', { command: 'import', cliVersion: '1.0.0' }, async () => {
 *   // 在此安全地操作数据库
 * });
 * ```
 */
export async function withExclusiveDataLock<T>(
  lockPath: string,
  metadata: LockMetadata,
  action: () => Promise<T>,
): Promise<T> {
  // 构造锁文件内容（JSON 格式的诊断信息）
  const payload = {
    pid: process.pid,
    host: hostname(),
    command: metadata.command,
    startedAt: new Date().toISOString(),
    cliVersion: metadata.cliVersion,
  };

  let handle;
  try {
    // 尝试排他创建锁文件（O_EXCL | O_CREAT | O_WRONLY）
    // 权限 0o600：仅所有者可读写
    handle = await open(lockPath, 'wx', 0o600);
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;
    if (errorCode !== 'EEXIST') {
      throw new CliError({
        code: 'DATA_LOCK_OPEN_FAILED',
        category: 'local-data',
        message: `The data lock file could not be created (${errorCode ?? 'unknown I/O error'}).`,
        hint: 'Check that the state directory exists and that its permissions and storage are available.',
        retryable: false,
        exitCode: 5,
        ...(error instanceof Error && error.stack !== undefined ? { debugStack: error.stack } : {}),
      });
    }
    // 锁文件已存在：读取其中的 PID 信息判断是否为僵尸锁
    let existing: { pid?: number; command?: string; startedAt?: string };
    try {
      existing = JSON.parse(await readFile(lockPath, 'utf8')) as { pid?: number };
    } catch {
      throw new CliError({
        code: 'DATA_LOCK_CORRUPT',
        category: 'local-data',
        message: 'The data lock file is corrupted.',
        hint: `Inspect and remove the lock file if no hithink-finance data command is running: ${lockPath}`,
        retryable: false,
        exitCode: 5,
      });
    }
    if (typeof existing.pid === 'number' && !alive(existing.pid)) {
      // 原持有进程已死 → 清理僵尸锁并递归重试
      await rm(lockPath, { force: true });
      return withExclusiveDataLock(lockPath, metadata, action);
    }
    // 原进程仍存活 → 返回稳定的本地数据错误，避免泄露原始 EEXIST
    if (typeof existing.pid === 'number') {
      throw new CliError({
        code: 'DATA_LOCKED',
        category: 'local-data',
        message: `Another data operation is already running with PID ${existing.pid}.`,
        hint: `Wait for ${existing.command ?? 'the active data command'} to finish, then retry. Do not delete ${lockPath} while that PID is alive.`,
        retryable: true,
        exitCode: 5,
      });
    }
    throw new CliError({
      code: 'DATA_LOCK_CORRUPT',
      category: 'local-data',
      message: 'The data lock file does not contain a valid PID.',
      hint: `Inspect and remove the lock file if no hithink-finance data command is running: ${lockPath}`,
      retryable: false,
      exitCode: 5,
    });
  }

  try {
    // 将诊断信息写入锁文件
    await handle.writeFile(JSON.stringify(payload));
    await handle.close();
    // 执行受保护的操作
    return await action();
  } finally {
    // finally 确保锁文件始终被清理（即使操作抛出异常）
    // 先尝试关闭文件句柄（可能已被上面的 close 关闭，忽略错误）
    await handle.close().catch(() => undefined);
    // 删除锁文件释放锁（force 忽略文件不存在的错误）
    await rm(lockPath, { force: true });
  }
}
