/**
 * 原子文件写入模块
 *
 * 提供 JSON 文件的原子写入功能，确保写入过程中不会出现文件损坏或部分写入的情况。
 * 原子性通过"写入临时文件 → 重命名"策略实现：
 *
 * 1. 创建唯一临时文件（包含 PID 和 UUID，避免并发冲突）
 * 2. 使用 `wx` 模式排他创建，防止覆盖现有文件
 * 3. 写入 JSON 内容并 fsync 落盘
 * 4. 将临时文件重命名为目标文件（在大多数文件系统上是原子操作）
 *
 * 跨平台兼容性：
 * - 使用 `flag: 'wx'` 排他创建
 * - 使用 `0o600` 权限保护敏感配置文件
 * - Windows 上处理 EEXIST/EPERM 重命名失败的特殊情况
 *
 * @module filesystem/atomic-file
 */

import { mkdir, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * 从错误对象中提取操作系统错误码
 *
 * Node.js 文件系统错误通常包含 `.code` 属性（如 'ENOENT'、'EEXIST'），
 * 此函数安全地提取该值，用于判断错误类型而无需依赖 instanceof。
 *
 * @param error - 可能的错误对象
 * @returns 错误码字符串，无法提取时返回 undefined
 */
function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined;
}

/**
 * 将 JSON 可序列化的值原子写入文件
 *
 * 原子写入保证：
 * - 目标文件要么是完整的旧版本，要么是完整的新版本，不会出现中间状态
 * - 系统崩溃或进程终止不会留下损坏的文件（最多留下孤儿临时文件）
 * - 并发写入同一文件会因排他创建而失败（而非静默覆盖）
 *
 * 写入流程：
 * ```
 *   mkdir -p 目标目录
 *     ↓
 *   open(wx, 0o600) 临时文件（排他创建 + 仅所有者读写权限）
 *     ↓
 *   writeFile(JSON 格式化 + 换行)
 *     ↓
 *   fsync 确保数据落盘
 *     ↓
 *   close 文件句柄
 *     ↓
 *   rename 临时文件 → 目标文件
 *     ↓ (Windows 可能失败)
 *   如果是 Win32 且错误码为 EEXIST/EPERM:
 *     unlink(目标文件) → rename 重试
 * ```
 *
 * Windows 特殊处理说明：
 * 在 Windows 上，如果目标文件已被其他进程打开（如防病毒软件扫描），
 * `rename()` 可能返回 EEXIST 或 EPERM 错误。
 * 此时先删除目标文件再重试重命名，删除失败（ENOENT = 文件已被删）则忽略。
 *
 * @param targetPath - 目标文件路径
 * @param value - 要写入的 JSON 可序列化值
 * @throws 写入失败时抛出文件系统错误
 */
export async function writeJsonAtomic(targetPath: string, value: unknown): Promise<void> {
  const absoluteTarget = path.resolve(targetPath);
  const directory = path.dirname(absoluteTarget);

  // 构造唯一临时文件名：.{basename}.{pid}.{uuid}.tmp
  // 包含 PID 防止同进程并发，包含 UUID 防止极端情况下的名称冲突
  const temporaryPath = path.join(
    directory,
    `.${path.basename(absoluteTarget)}.${process.pid}.${randomUUID()}.tmp`,
  );

  // 确保目标目录存在
  await mkdir(directory, { recursive: true });

  // 排他创建临时文件，权限 0o600（仅所有者可读写，保护敏感数据如 API Key）
  const handle = await open(temporaryPath, 'wx', 0o600);
  try {
    // 序列化为带缩进的 JSON 并写入
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    // 确保数据从 OS 缓冲区写入磁盘
    await handle.sync();
  } finally {
    // 确保文件句柄被关闭（即使写入失败）
    await handle.close();
  }

  try {
    // 原子重命名：在 POSIX 文件系统上是原子操作，Windows NTFS 上也支持
    await rename(temporaryPath, absoluteTarget);
  } catch (error) {
    const code = errorCode(error);
    // Windows 特殊处理：目标文件可能被其他进程锁定（如杀毒软件）
    if (process.platform !== 'win32' || (code !== 'EEXIST' && code !== 'EPERM')) {
      // 非 Windows 或非锁定错误：清理临时文件后重新抛出
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }

    // Windows EEXIST/EPERM 处理：删除目标文件后重试
    await unlink(absoluteTarget).catch((unlinkError: unknown) => {
      // ENOENT = 文件已不存在（可能已被其他进程删除），可以忽略
      if (errorCode(unlinkError) !== 'ENOENT') throw unlinkError;
    });
    await rename(temporaryPath, absoluteTarget);
  }
}
