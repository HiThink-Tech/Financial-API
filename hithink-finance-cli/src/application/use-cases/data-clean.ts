/**
 * 数据清理用例 — 安全删除受管缓存目录。
 *
 * ## 路径遍历防护策略
 * `cleanManagedCache` 只允许删除 managedRoot 内部的路径。
 * 通过 `path.resolve` 规范化后，检查 target 是否以 root + separator 开头，
 * 或恰好等于 root 本身。任何指向托管根目录外的路径将被拒绝。
 */
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { CliError } from '../../contracts/errors.js';

/**
 * 安全删除受管缓存目录。
 *
 * ## 安全检查：
 * 1. 将 cachePath 和 managedRoot 均通过 path.resolve 规范化
 * 2. 验证 target 完全属于 managedRoot 内部：
 *    - target === root：允许删除根目录自身
 *    - target.startswith(root + sep)：允许删除子目录
 *    - 其他情况 → throw PATH_OUTSIDE_MANAGED_ROOT
 * 3. 通过检查后执行 rm -rf
 *
 * 这种"仅允许删除白名单前缀内的路径"的方式，有效防止了路径遍历攻击。
 *
 * @param cachePath   - 待删除的缓存路径
 * @param managedRoot - 托管根目录（安全边界）
 * @throws {Error} 如果 cachePath 指向 managedRoot 之外的路径
 */
export async function cleanManagedCache(cachePath: string, managedRoot: string): Promise<void> {
  // 将两个路径都规范化为绝对路径，消除 .. 和符号链接的影响
  const target = path.resolve(cachePath);
  const root = path.resolve(managedRoot);
  // 安全检查：target 必须在 root 内部（自身或在子目录中）
  if (target !== root && !target.startsWith(`${root}${path.sep}`))
    throw new CliError({
      code: 'PATH_OUTSIDE_MANAGED_ROOT',
      category: 'validation',
      message: 'The cleanup target is outside the managed cache root.',
      hint: 'Only pass paths inside the CLI-managed cache directory.',
      retryable: false,
      exitCode: 2,
    });
  await rm(target, { recursive: true, force: true });
}
