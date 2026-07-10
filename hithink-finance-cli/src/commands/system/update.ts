/**
 * 更新命令模块
 *
 * 注册 `update` 顶级命令，管理 CLI 工具的版本更新。
 *
 * ### 更新流程
 * 1. **缓存检查** — 读取上次更新的缓存记录，决定是否需要刷新更新信息
 *    - `stale` 状态：缓存有效，直接显示结果
 *    - `refresh` 状态：缓存过期，触发后台更新检查
 * 2. **npm 安装** — 调用 `npm install -g <package>@<version>` 安装指定或最新版本
 * 3. **Skills 同步** — 安装完成后自动执行 `hithink-finance skills sync --repair --yes` 修复 Skill 文件
 * 4. **Doctor 诊断** — 安装完成后自动执行 `hithink-finance doctor --format json` 验证运行环境正常
 *
 * ### 选项
 * - `--check`：仅检查新版本（不安装），读取更新缓存
 * - `--repair`：修复模式标记
 * - `--target-version <version>`：指定安装的目标版本（SemVer 格式）
 *
 * 可通过环境变量自定义执行路径：
 * - `HITHINK_FINANCE_NPM_EXECUTABLE` — 自定义 npm 路径
 * - `HITHINK_FINANCE_CLI_EXECUTABLE` — 自定义 CLI 路径
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import type { PackageMetadata } from '../../cli/program.js';
import type { ResolvedConfig } from '../../application/config.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { CliError } from '../../contracts/errors.js';
import { installGlobalPackage, runExecutable } from '../../infrastructure/updater/install.js';
import { renderResult } from '../../output/renderer.js';
import { readUpdateCache, scheduleUpdateCheck } from '../../infrastructure/updater/check.js';
import { updateCacheDecision } from '../../infrastructure/updater/cache.js';
import type { PlatformPaths } from '../../infrastructure/filesystem/platform-paths.js';
import path from 'node:path';

/**
 * 注册 update 更新命令
 *
 * 创建 `update` 命令，处理版本检查和安装流程。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param metadata - 包元数据（名称、版本等）
 * @param dependencies - 更新所需依赖（packageRoot、platformPaths）
 */
export function registerUpdateCommand(
  program: Command,
  context: CliContext,
  metadata: PackageMetadata,
  dependencies: {
    packageRoot: string;
    platformPaths: PlatformPaths;
    resolvedConfig: ResolvedConfig;
  },
): void {
  const command = program
    .command('update')
    .description(localizeText(context.language, 'Check or repair the installed CLI version'))
    .option(
      '--check',
      localizeText(context.language, 'Check for a newer version without installing'),
    )
    .option('--repair', localizeText(context.language, 'Repair the current or target installation'))
    .option(
      '--target-version <version>',
      localizeText(context.language, 'Install a specific SemVer version'),
    );
  command.action(async () => {
    const options = command.opts<{
      check?: boolean;
      repair?: boolean;
      targetVersion?: string;
    }>();

    // ========== 步骤 1：缓存检查（--check 模式） ==========
    if (options.check === true) {
      const cacheFile = path.join(dependencies.platformPaths.stateDir, 'update-cache.json');
      const cached = await readUpdateCache(cacheFile);
      // 根据缓存时效判断是否需要触发后台刷新
      const decision = updateCacheDecision(
        cached,
        Date.now(),
        !dependencies.resolvedConfig.updateCheck,
      );
      // 缓存过期时调度后台更新检查
      if (decision === 'refresh')
        scheduleUpdateCheck(dependencies.packageRoot, metadata.name, cacheFile);
      await renderResult(
        successEnvelope(
          'update.check',
          {
            currentVersion: metadata.version,
            latestVersion: cached?.latestVersion,
            cacheStatus: decision,
            refreshScheduled: decision === 'refresh',
            networkUsed: false,
          },
          { requestId: context.requestId },
        ),
        context,
      );
      return;
    }

    // ========== 步骤 2：版本号校验 ==========
    const version = options.targetVersion ?? metadata.version;
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
      throw new CliError({
        code: 'CLI_BAD_ARGUMENT',
        category: 'validation',
        message: 'Update version must be a valid SemVer value.',
        hint: 'Use a version such as 1.2.3 or 1.2.3-next.1.',
        retryable: false,
        exitCode: 2,
      });
    }

    // ========== 步骤 2：npm 安装 ==========
    const npm =
      process.env.HITHINK_FINANCE_NPM_EXECUTABLE ??
      (process.platform === 'win32' ? 'npm.cmd' : 'npm');
    const code = await installGlobalPackage(npm, metadata.name, version);
    if (code !== 0)
      throw new CliError({
        code: 'UPDATE_INSTALL_FAILED',
        category: 'internal',
        message: 'npm global installation failed.',
        hint: 'Run update --repair after checking npm permissions.',
        retryable: true,
        exitCode: 1,
      });

    // ========== 步骤 3：Skills 同步修复 ==========
    const cli =
      process.env.HITHINK_FINANCE_CLI_EXECUTABLE ??
      (process.platform === 'win32' ? 'hithink-finance.cmd' : 'hithink-finance');
    const skillsCode = await runExecutable(cli, ['skills', 'sync', '--repair', '--yes']);

    // ========== 步骤 4：Doctor 诊断 ==========
    const doctorCode = await runExecutable(cli, ['doctor', '--format', 'json']);
    if (skillsCode !== 0 || doctorCode !== 0)
      throw new CliError({
        code: 'UPDATE_REPAIR_PARTIAL',
        category: 'internal',
        message: 'The package updated, but Skill synchronization or doctor failed.',
        hint: 'Run `hithink-finance update --repair`.',
        retryable: true,
        exitCode: 6,
      });
    await renderResult(
      successEnvelope(
        'update',
        { version, repaired: options.repair === true },
        { requestId: context.requestId },
      ),
      context,
    );
  });
}
