/**
 * 卸载命令模块
 *
 * 注册 `uninstall` 顶级命令，处理 CLI 工具的完整卸载流程。
 *
 * ### 卸载流程
 * 1. **计划**（`--plan`） — 仅查看卸载计划，不执行任何操作
 *    - 未传 `--plan` 时要求全局 `--yes` 确认
 * 2. **Skills 移除** — 从各 Agent 发现目录移除托管 Skill 文件
 * 3. **清理数据**（`--purge-data`） — 删除 dataDir（DuckDB 数据库等）
 * 4. **清理配置**（`--purge-config`） — 删除 configDir（配置文件）
 * 5. **清理凭据**（`--purge-credentials`） — 从系统凭据管理器删除所有 API Key
 * 6. **npm 卸载** — 执行 `npm uninstall -g <package>` 从全局移除
 *
 * ### 选项
 * - `--plan`：仅查看卸载计划
 * - `--purge-data`：删除数据目录
 * - `--purge-config`：删除配置目录
 * - `--purge-credentials`：删除所有 API 凭据
 * - `--yes`（全局）：确认执行（非 plan 模式必需）
 */

import { rm } from 'node:fs/promises';
import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import type { PackageMetadata } from '../../cli/program.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { CliError } from '../../contracts/errors.js';
import { removeSkills } from '../../infrastructure/skills/installer.js';
import { uninstallGlobalPackage } from '../../infrastructure/updater/install.js';
import type { PlatformPaths } from '../../infrastructure/filesystem/platform-paths.js';
import type { ApiKeyAuthProvider } from '../../infrastructure/credentials/api-key-provider.js';
import { renderResult } from '../../output/renderer.js';

/**
 * 注册 uninstall 卸载命令
 *
 * 创建 `uninstall` 命令，执行完整的 CLI 卸载流程。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param metadata - 包元数据
 * @param dependencies - 卸载所需依赖（packageRoot、platformPaths、authProvider）
 */
export function registerUninstallCommand(
  program: Command,
  context: CliContext,
  metadata: PackageMetadata,
  dependencies: {
    packageRoot: string;
    platformPaths: PlatformPaths;
    authProvider: ApiKeyAuthProvider;
  },
): void {
  const command = program
    .command('uninstall')
    .description(localizeText(context.language, 'Plan or run CLI uninstall cleanup'))
    .option(
      '--plan',
      localizeText(context.language, 'Show the uninstall plan without deleting anything'),
    )
    .option('--purge-data', localizeText(context.language, 'Delete local data during uninstall'))
    .option(
      '--purge-config',
      localizeText(context.language, 'Delete local configuration during uninstall'),
    )
    .option(
      '--purge-credentials',
      localizeText(context.language, 'Delete all CLI-managed API key credentials'),
    );
  command.action(async () => {
    const options = command.opts<{
      plan?: boolean;
      purgeData?: boolean;
      purgeConfig?: boolean;
      purgeCredentials?: boolean;
    }>();
    const globals = command.optsWithGlobals<{ yes?: boolean }>();
    const npmCommand = ['npm', 'uninstall', '-g', metadata.name];

    // ========== 步骤 1：非 plan 模式的卸载流程 ==========
    if (options.plan !== true) {
      // 卸载操作需要显式确认
      if (globals.yes !== true)
        throw new CliError({
          code: 'CONFIRMATION_REQUIRED',
          category: 'validation',
          message: 'Uninstall requires explicit confirmation.',
          hint: 'Review `uninstall --plan`, then rerun with `--yes`.',
          retryable: false,
          exitCode: 2,
        });

      // ========== 步骤 2：移除 Agent Skills ==========
      const skillResult = await removeSkills(dependencies.packageRoot);
      if (skillResult.code !== 0)
        throw new CliError({
          code: 'UNINSTALL_SKILLS_PARTIAL',
          category: 'internal',
          message: 'Managed Skills could not be fully removed.',
          hint: 'Run `hithink-finance skills remove` and retry.',
          retryable: true,
          exitCode: 6,
        });

      // ========== 步骤 3：清理数据目录 ==========
      if (options.purgeData === true)
        await rm(dependencies.platformPaths.dataDir, { recursive: true, force: true });

      // ========== 步骤 4：清理配置目录 ==========
      if (options.purgeConfig === true)
        await rm(dependencies.platformPaths.configDir, { recursive: true, force: true });

      // ========== 步骤 5：清理凭据 ==========
      if (options.purgeCredentials === true) await dependencies.authProvider.logoutAll();

      // ========== 步骤 6：npm 卸载 ==========
      const npm =
        process.env.HITHINK_FINANCE_NPM_EXECUTABLE ??
        (process.platform === 'win32' ? 'npm.cmd' : 'npm');
      const code = await uninstallGlobalPackage(npm, metadata.name);
      if (code !== 0)
        throw new CliError({
          code: 'UNINSTALL_NPM_FAILED',
          category: 'internal',
          message: 'npm global uninstall failed.',
          hint: `Run ${npmCommand.join(' ')} manually.`,
          retryable: true,
          exitCode: 1,
        });
    }

    // 返回卸载结果（plan 模式仅展示计划，non-plan 模式展示执行结果）
    await renderResult(
      successEnvelope(
        'uninstall',
        {
          planned: options.plan === true,
          purgeData: options.purgeData === true,
          purgeConfig: options.purgeConfig === true,
          purgeCredentials: options.purgeCredentials === true,
          npmCommand,
        },
        { requestId: context.requestId },
      ),
      context,
    );
  });
}
