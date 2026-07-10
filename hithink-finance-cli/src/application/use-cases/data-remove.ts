/**
 * 数据删除用例 — 安全删除数据库文件。
 *
 * ## 双重安全保障
 * 1. **路径确认**：传入的 databasePath 必须精确匹配 allowedExactPath
 *    （通过 path.resolve 规范化后做严格相等比较），防止删除错误的文件
 * 2. **用户确认**：必须 `confirmed === true`，拒绝未经用户明确同意的删除操作
 */
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { CliError } from '../../contracts/errors.js';

/**
 * 安全删除数据库文件。
 *
 * 调用方通常先打印将要删除的路径并询问用户确认（prompt），
 * 确认后才传入 `confirmed = true`。
 *
 * @param databasePath    - 待删除的数据库路径
 * @param allowedExactPath - 允许删除的精确路径（白名单）
 * @param confirmed        - 用户是否已确认删除操作
 * @throws {Error} PATH_NOT_CONFIRMED — 如果目标路径与白名单不匹配
 * @throws {Error} CONFIRMATION_REQUIRED — 如果用户未确认
 */
export async function removeDatabase(
  databasePath: string,
  allowedExactPath: string,
  confirmed: boolean,
): Promise<void> {
  // 规范化路径后做精确匹配，防止路径变体攻击
  const target = path.resolve(databasePath);
  const allowed = path.resolve(allowedExactPath);
  if (target !== allowed)
    throw new CliError({
      code: 'PATH_NOT_CONFIRMED',
      category: 'validation',
      message: 'The database path does not match the confirmed removal target.',
      hint: 'Run `data remove --plan` and confirm the exact path before deleting.',
      retryable: false,
      exitCode: 2,
    });
  // 确认检查：拒绝未经用户同意的删除
  if (!confirmed)
    throw new CliError({
      code: 'CONFIRMATION_REQUIRED',
      category: 'validation',
      message: 'Database removal requires explicit confirmation.',
      hint: 'Re-run with --yes after reviewing the removal plan.',
      retryable: false,
      exitCode: 2,
    });
  await rm(target, { force: true });
}
