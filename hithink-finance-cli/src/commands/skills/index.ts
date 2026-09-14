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
import {
  readSkillsLifecycleStatus,
  supportedSkillAgents,
  type SkillAgent,
} from '../../infrastructure/skills/lifecycle.js';
import { createPlatformPaths } from '../../infrastructure/filesystem/platform-paths.js';
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
    .description(
      localizeText(
        context.language,
        'Manage bundled Skills for supported Agents; install and upgrades sync saved targets',
      ),
    )
    .addHelpText(
      'after',
      '\nDefault sync detects installed Agents and shares one linked content copy. Use `skills status` to inspect targets.',
    );

  // ========== skills status ==========
  skills
    .command('status')
    .description('Inspect bundled content, saved strategy, and each managed Agent target')
    .action(async () =>
      renderResult(
        successEnvelope(
          'skills.status',
          {
            ...(await readBundledSkillsStatus(packageRoot)),
            ...(await readSkillsLifecycleStatus(packageRoot, createPlatformPaths())),
          },
          {
            requestId: context.requestId,
          },
        ),
        context,
      ),
    );

  // ========== skills sync ==========
  skills
    .command('sync')
    .description('Sync saved targets; --agent appends a target, and --agent auto enables detection')
    .option('--repair', 'Repair a missing or damaged CLI-managed link or copy')
    .option(
      '--agent <name>',
      `Append a target (${supportedSkillAgents.join(', ')}) or use auto`,
      collect,
      [],
    )
    .option(
      '--directory <absolute-path>',
      'Use an explicit Agent Skills root; requires one named --agent',
    )
    .option(
      '--copy',
      'Use a managed copy instead of a directory link; persists for the named target',
    )
    .addHelpText(
      'after',
      '\nExamples:\n  hithink-finance skills sync --agent claude-code\n  hithink-finance skills sync --agent workbuddy --agent qclaw\n  hithink-finance skills sync --agent auto\n  hithink-finance skills sync --agent cursor --directory <absolute-path> --copy',
    )
    .action(
      async (options: {
        repair?: boolean;
        agent: string[];
        directory?: string;
        copy?: boolean;
      }) => {
        const syncOptions = parseSyncOptions(options);
        // 同步 Skill 文件到各 Agent 的发现目录
        const result = await syncSkills(packageRoot, context.signal, {
          ...syncOptions,
          reactivate: process.env.HITHINK_FINANCE_SKILLS_INSTALL !== '1',
        });
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
              targetsVerified: result.targets.length > 0,
              targets: result.targets,
              backupCount: result.backupCount,
            },
            { requestId: context.requestId },
          ),
          context,
        );
      },
    );

  // ========== skills remove ==========
  skills
    .command('remove')
    .description(
      'Remove CLI-managed Skills; --agent removes one target and excludes it from auto detection',
    )
    .option('--agent <name>', `Remove one target (${supportedSkillAgents.join(', ')})`, collect, [])
    .addHelpText(
      'after',
      '\nExamples:\n  hithink-finance skills remove --agent codex\n  hithink-finance skills remove',
    )
    .action(async (options: { agent: string[] }) => {
      const agents = parseNamedAgents(options.agent);
      // 从各 Agent 的发现目录移除托管 Skill 文件
      const result = await removeSkills(
        packageRoot,
        context.signal,
        agents.length === 0 ? undefined : agents,
      );
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
        successEnvelope(
          'skills.remove',
          { removed: true, targets: result.targets },
          { requestId: context.requestId },
        ),
        context,
      );
    });
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function parseNamedAgents(values: string[]): SkillAgent[] {
  const unknown = values.filter(
    (value) => !(supportedSkillAgents as readonly string[]).includes(value),
  );
  if (unknown.length > 0)
    throw new CliError({
      code: 'SKILLS_UNKNOWN_AGENT',
      category: 'validation',
      message: `Unknown Agent target: ${unknown.join(', ')}.`,
      hint: `Choose one of: ${supportedSkillAgents.join(', ')}.`,
      retryable: false,
      exitCode: 2,
    });
  return [...new Set(values)] as SkillAgent[];
}

function parseSyncOptions(options: { agent: string[]; directory?: string; copy?: boolean }): {
  agents?: SkillAgent[];
  auto?: boolean;
  directory?: string;
  copy?: boolean;
} {
  if (options.agent.includes('auto')) {
    if (options.agent.length !== 1)
      throw new CliError({
        code: 'SKILLS_BAD_AGENT_SELECTION',
        category: 'validation',
        message: 'auto cannot be combined with named Agent targets.',
        hint: 'Use --agent auto alone, or use one or more named --agent options.',
        retryable: false,
        exitCode: 2,
      });
    if (options.directory !== undefined || options.copy === true)
      throw new CliError({
        code: 'SKILLS_BAD_AGENT_SELECTION',
        category: 'validation',
        message: '--directory and --copy require one named Agent target.',
        hint: 'Use --agent <name> --directory <absolute-path> [--copy].',
        retryable: false,
        exitCode: 2,
      });
    return {
      auto: true,
    };
  }
  if (options.directory !== undefined && options.agent.length !== 1)
    throw new CliError({
      code: 'SKILLS_BAD_DIRECTORY',
      category: 'validation',
      message: '--directory requires exactly one named Agent target.',
      hint: 'Use --agent <name> --directory <absolute-path>.',
      retryable: false,
      exitCode: 2,
    });
  if (options.copy === true && options.agent.length === 0)
    throw new CliError({
      code: 'SKILLS_BAD_DELIVERY',
      category: 'validation',
      message: '--copy requires one or more named Agent targets.',
      hint: 'Use --agent <name> --copy.',
      retryable: false,
      exitCode: 2,
    });
  return {
    ...(options.agent.length === 0 ? {} : { agents: parseNamedAgents(options.agent) }),
    ...(options.directory === undefined ? {} : { directory: options.directory }),
    ...(options.copy === true ? { copy: true } : {}),
  };
}
