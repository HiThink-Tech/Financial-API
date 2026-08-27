#!/usr/bin/env node

/**
 * CLI entry point — bootstraps the process, resolves configuration, builds the
 * Commander program tree, and dispatches the parsed command.
 *
 * CLI 入口模块 — 初始化进程、解析配置、构建 Commander 命令树并分发解析后的命令。
 *
 * ## Flow 执行流程
 *
 * 1. **Load package metadata** — read `version` from `package.json`.
 *    加载包元数据 — 从 `package.json` 读取 `version`。
 * 2. **Ensure argv** — default to `--help` when no arguments are given.
 *    确保有参数 — 无参数时默认展示 `--help`。
 * 3. **Quick path for `--version` / `-V`** — print version and exit immediately.
 *    `--version` / `-V` 快速路径 — 直接输出版本号后退出。
 * 4. **Resolve configuration** — merge CLI flags, env vars, and config file.
 *    解析配置 — 合并 CLI 标志、环境变量和配置文件。
 * 5. **Build the program** — assemble the full Commander command tree.
 *    构建程序 — 组装完整的 Commander 命令树。
 * 6. **Parse & execute** — let Commander route to the correct action.
 *    解析并执行 — 由 Commander 路由到正确的 action。
 * 7. **Error handling** — convert every throwable into a structured error envelope.
 *    错误处理 — 将所有异常转换为结构化错误信封。
 */

import { createRequire } from 'node:module';
import { CommanderError } from 'commander';
import { createCliContext, inferCommand, optionValue, type OutputFormat } from './context.js';
import { createProgram, commanderError, type PackageMetadata } from './program.js';
import { errorEnvelope } from '../contracts/envelope.js';
import { internalError } from '../contracts/errors.js';
import { renderResult } from '../output/renderer.js';
import { ApiKeyAuthProvider } from '../infrastructure/credentials/api-key-provider.js';
import { KeyringCredentialStore } from '../infrastructure/credentials/keyring.js';
import path from 'node:path';
import { createPlatformPaths } from '../infrastructure/filesystem/platform-paths.js';
import { loadConfig } from '../application/config.js';
import { maybeEmitCachedUpdateNotice } from '../infrastructure/updater/check.js';
import { createProcessShutdown, shutdownExitCode } from '../infrastructure/process/shutdown.js';

// 步骤 1: 加载 package.json 获取版本号等元数据
const require = createRequire(import.meta.url);
const packageMetadata = require('../../package.json') as PackageMetadata;
const argv = process.argv.slice(2);

// 步骤 2: 无参数时默认展示帮助信息
if (argv.length === 0) {
  argv.push('--help');
  process.argv.push('--help');
}

// 步骤 3: 基于原始 argv 创建初始上下文（可能在配置加载后被覆盖）
let context = createCliContext(argv);

// 步骤 3（快速路径）: 仅输出版本号，不加载配置也不构建程序树
if (argv.length === 1 && (argv[0] === '--version' || argv[0] === '-V')) {
  process.stdout.write(`${packageMetadata.version}\n`);
} else
// 步骤 4-7: 完整启动流程
{
  const shutdown = createProcessShutdown();
  try {
    // 步骤 4: 解析配置 —— 合并 CLI 参数、环境变量和配置文件
    const platformPaths = createPlatformPaths();
    const packageRoot = path.resolve(import.meta.dirname, '../..');
    const rawDbPath = optionValue(argv, '--db');
    const rawProfile = optionValue(argv, '--profile');
    const rawFormat = optionValue(argv, '--format');
    const rawLanguage = optionValue(argv, '--lang');
    const rawConfigPath = optionValue(argv, '--config');
    const resolvedConfig = await loadConfig({
      paths: platformPaths,
      cli: {
        // 仅在 CLI 显式传入时才覆盖配置，避免配置文件中已有值被 undefined 覆盖
        ...(rawDbPath === undefined ? {} : { dbPath: rawDbPath }),
        ...(rawProfile === undefined ? {} : { profile: rawProfile }),
        ...(rawFormat === undefined ? {} : { format: rawFormat as OutputFormat }),
        ...(rawLanguage === 'zh-CN' || rawLanguage === 'en' ? { language: rawLanguage } : {}),
        ...(rawConfigPath === undefined ? {} : { configPath: rawConfigPath }),
      },
    });

    // 用解析后的配置重新创建上下文（format / language 可能来自配置文件）
    context = createCliContext(argv, {
      format: resolvedConfig.format,
      ...(resolvedConfig.language === undefined ? {} : { language: resolvedConfig.language }),
      signal: shutdown.signal,
    });

    // 步骤 5: 构建完整的 Commander 程序树
    const program = createProgram(packageMetadata, context, {
      authProvider: new ApiKeyAuthProvider(new KeyringCredentialStore(), process.env),
      fuyaoBaseUrl: process.env.HITHINK_FINANCE_FUYAO_BASE_URL ?? 'https://fuyao.aicubes.cn',
      packageRoot,
      platformPaths: { ...platformPaths, defaultDbPath: resolvedConfig.dbPath },
      resolvedConfig,
    });

    // 步骤 6: 解析命令行参数并执行匹配的 action
    await program.parseAsync(process.argv);
    if (inferCommand(argv) !== 'update') {
      await maybeEmitCachedUpdateNotice({
        packageRoot,
        packageName: packageMetadata.name,
        currentVersion: packageMetadata.version,
        cacheFile: path.join(platformPaths.stateDir, 'update-cache.json'),
        stderr: context.stderr,
        disabled: !resolvedConfig.updateCheck,
      });
    }
  } catch (error) {
    // 步骤 7: 统一的错误处理流程
    // Commander 内部抛出的 `--help` / `-h` 错误 exitCode 为 0，直接放行
    if (error instanceof CommanderError && error.exitCode === 0) {
      process.exitCode = 0;
    } else {
      // 将 Commander 错误或非结构化异常转换为 CliError
      const cliError =
        error instanceof CommanderError
          ? commanderError(error, context.language)
          : internalError(error);

      // 渲染结构化的错误信封（JSON / CSV / table 等格式），供 AI Agent 解析
      await renderResult(
        errorEnvelope(inferCommand(argv), cliError, packageMetadata.version, {
          debug: context.debug,
          requestId: context.requestId,
          ...(packageMetadata.bugs?.url === undefined
            ? {}
            : { bugReportBaseUrl: packageMetadata.bugs.url }),
        }),
        context,
      );

      // 使用 CliError 中的退出码退出进程
      process.exitCode = shutdownExitCode(shutdown.signal.reason) ?? cliError.exitCode;
    }
  } finally {
    shutdown.dispose();
  }
}
