/**
 * Agent Skills 管理命令模块
 *
 * 注册 `skills` 命令组，管理 Agent（如 CodeBuddy / Claude）的 Skill 文件同步和移除：
 *
 * ### 子命令一览
 * - `skills status` — 显示 Skill 安装状态和规范路径
 * - `skills sync`   — 将 package 中的 Skill 文件同步到 Agent 的发现目录
 * - `skills remove` — 从 Agent 发现目录中移除托管 Skill 文件
 *
 * Skill 文件位于 `{packageRoot}/skills` 目录中，
 * 通过符号链接或复制方式部署到各 Agent 的 skills 发现路径。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { CliError } from '../../contracts/errors.js';
import { removeSkills, syncSkills } from '../../infrastructure/skills/installer.js';
import { readBundledSkillsStatus } from '../../infrastructure/skills/status.js';
import { renderResult } from '../../output/renderer.js';

/**
 * 注册 Skills 管理命令组
 *
 * 创建 `skills` 命令及其三个子命令（status / sync / remove）。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param packageRoot - package 根目录（指向 `{packageRoot}/skills` 目录）
 */
export function registerSkillsCommands(
  program: Command,
  context: CliContext,
  packageRoot: string,
): void {
  const skills = program
    .command('skills')
    .description(localizeText(context.language, 'Manage Agent Skills'));

  // ========== skills status ==========
  skills.command('status').action(async () =>
    renderResult(
      successEnvelope('skills.status', await readBundledSkillsStatus(packageRoot), {
        requestId: context.requestId,
      }),
      context,
    ),
  );

  // ========== skills sync ==========
  skills
    .command('sync')
    .option('--repair')
    .action(async (options: { repair?: boolean }) => {
      // 同步 Skill 文件到各 Agent 的发现目录
      const result = await syncSkills(packageRoot, context.signal);
      // 如果部分 Agent 同步失败，抛出可重试的错误
      if (result.code !== 0)
        throw new CliError({
          code: 'SKILLS_SYNC_PARTIAL',
          category: 'internal',
          message: 'One or more Agent Skill targets failed to synchronize.',
          hint: 'Run `hithink-finance skills sync --repair` after checking Agent installations.',
          retryable: true,
          exitCode: 6,
        });
      await renderResult(
        successEnvelope(
          'skills.sync',
          {
            synchronized: true,
            mode: options.repair === true ? 'repair' : 'sync',
            targetsVerified: false,
          },
          { requestId: context.requestId },
        ),
        context,
      );
    });

  // ========== skills remove ==========
  skills.command('remove').action(async () => {
    // 从各 Agent 的发现目录移除托管 Skill 文件
    const result = await removeSkills(packageRoot, context.signal);
    if (result.code !== 0)
      throw new CliError({
        code: 'SKILLS_REMOVE_PARTIAL',
        category: 'internal',
        message: 'One or more managed Agent Skills could not be removed.',
        hint: 'Check Agent discovery directories and retry `hithink-finance skills remove`.',
        retryable: true,
        exitCode: 6,
      });
    await renderResult(
      successEnvelope('skills.remove', { removed: true }, { requestId: context.requestId }),
      context,
    );
  });
}
