/**
 * Program builder — assembles the full Commander command tree.
 *
 * 程序构建器模块 — 组装完整的 Commander 命令树。
 *
 * This module is responsible for creating the root Commander instance, attaching
 * all global options, registering every sub-command (31 in total), wiring the
 * pre-action validation hook, and exposing a factory (`createProgram`) that
 * `main.ts` calls to boot the CLI.
 * 此模块负责创建 Commander 根实例、挂载所有全局选项、注册所有子命令（共 31 个）、
 * 连接 preAction 校验钩子，并暴露 `main.ts` 在启动 CLI 时调用的工厂函数 `createProgram`。
 */

import { Command, CommanderError, Option } from 'commander';
import type { CliContext } from './context.js';
import { localizeText, translate } from './i18n.js';
import { successEnvelope } from '../contracts/envelope.js';
import { CliError } from '../contracts/errors.js';
import type { CommandDescriptor } from '../contracts/registry.js';
import { renderResult } from '../output/renderer.js';
import { registerAuthCommands } from '../commands/auth/index.js';
import type { ApiKeyAuthProvider } from '../infrastructure/credentials/api-key-provider.js';
import { registerSymbolCommands } from '../commands/symbol/index.js';
import { registerMarketCommands } from '../commands/market/index.js';
import { registerSpecialCommands } from '../commands/special/index.js';
import { registerFinancialCommands } from '../commands/financials/index.js';
import { registerIndexCommands } from '../commands/index/index.js';
import { registerCapabilitiesCommand } from '../commands/system/capabilities.js';
import { registerSchemaCommand } from '../commands/system/schema.js';
import { registerSkillsCommands } from '../commands/skills/index.js';
import { registerUpdateCommand } from '../commands/system/update.js';
import { registerUninstallCommand } from '../commands/system/uninstall.js';
import { registerDoctorCommand } from '../commands/system/doctor.js';
import { registerDataCommands } from '../commands/data/index.js';
import { registerDbCommands } from '../commands/db/index.js';
import { registerLocalMarketCommands } from '../commands/market/local.js';
import type { PlatformPaths } from '../infrastructure/filesystem/platform-paths.js';
import type { ResolvedConfig } from '../application/config.js';
import { registerConfigCommands } from '../commands/config/index.js';

/**
 * Minimal metadata extracted from `package.json` at startup.
 * 启动时从 `package.json` 提取的最小元数据。
 */
export interface PackageMetadata {
  /** Package name (e.g. `'@hithink/finance-cli'`).
   *  包名（例如 `'@hithink/finance-cli'`）。 */
  name: string;
  /** Semantic version string (e.g. `'1.2.3'`).
   *  语义化版本字符串（例如 `'1.2.3'`）。 */
  version: string;
}

/**
 * External dependencies injected into the program builder.
 * 注入到程序构建器的外部依赖。
 *
 * Keeps `createProgram` testable by allowing mocks / stubs to replace
 * real infrastructure at construction time.
 * 保持 `createProgram` 可测试，允许在构造时用 mock/stub 替换真实基础设施。
 */
export interface ProgramDependencies {
  /** API key authentication provider (keyring + env).
   *  API 密钥认证提供者（keyring + 环境变量）。 */
  authProvider: ApiKeyAuthProvider;
  /** Base URL for the Fuyao upstream API.
   *  拂晓上游 API 的基础 URL。 */
  fuyaoBaseUrl: string;
  /** Absolute path to the CLI package root directory.
   *  CLI 安装包根目录的绝对路径。 */
  packageRoot: string;
  /** Platform-specific paths (config, data, cache directories).
   *  平台特定路径（配置、数据、缓存目录）。 */
  platformPaths: PlatformPaths;
  /** Fully resolved runtime configuration.
   *  完全解析后的运行时配置。 */
  resolvedConfig: ResolvedConfig;
}

/**
 * Creates a fully configured Commander `Command` instance with all sub-commands
 * registered and global options attached.
 * 创建完全配置好的 Commander `Command` 实例，已注册所有子命令并挂载全局选项。
 *
 * ## 31-command tree 命令树结构
 *
 * | Group      | Commands registered                    |
 * |------------|----------------------------------------|
 * | `version`  | 1 (version descriptor)                 |
 * | `auth`     | 1 (login / logout / status…)           |
 * | `config`   | 1 (set / get / list…)                  |
 * | `symbol`   | 1 (search / info…)                     |
 * | `market`   | 2 (remote + local)                     |
 * | `special`  | 1 (limit-up / hot-stock…)              |
 * | `financials` | 1 (income / balance-sheet…)           |
 * | `index`    | 1 (catalog / constituents…)            |
 * | `system`   | 5 (capabilities / schema / update / uninstall / doctor) |
 * | `skills`   | 1 (skills sub-tree)                    |
 * | `data`     | 1 (init / sync / status / …)           |
 * | `db`       | 1 (describe / query / export)          |
 *
 * @param metadata     - Package metadata for the version command and CLI output.
 *                       包的元数据，用于版本命令和 CLI 输出。
 * @param context      - Resolved CLI context (format, language, …).
 *                       已解析的 CLI 上下文（格式、语言等）。
 * @param dependencies - Infrastructure dependencies (auth, paths, config).
 *                       基础设施依赖（认证、路径、配置）。
 * @returns A Commander `Command` instance ready to `parseAsync()`.
 *          准备好调用 `parseAsync()` 的 Commander `Command` 实例。
 */
export function createProgram(
  metadata: PackageMetadata,
  context: CliContext,
  dependencies: ProgramDependencies,
): Command {
  const program = new Command();
  program
    .name('hithink-finance')
    .description(translate(context.language, 'rootDescription'))
    // ---- 全局选项定义 ----
    .addOption(
      new Option('--format <format>', localizeText(context.language, 'output format'))
        .choices(['auto', 'json', 'ndjson', 'csv', 'table'])
        .default(dependencies.resolvedConfig.format),
    )
    .addOption(
      new Option(
        '--lang <lang>',
        localizeText(context.language, 'human interface language'),
      ).choices(['zh-CN', 'en']),
    )
    .option(
      '--profile <name>',
      localizeText(context.language, 'configuration and credential profile'),
      dependencies.resolvedConfig.profile,
    )
    .option('--config <path>', localizeText(context.language, 'explicit JSON configuration file'))
    .option('--api-key <value>', localizeText(context.language, 'API key for this process'))
    .option('--api-key-stdin', localizeText(context.language, 'read an API key from stdin'))
    .option('--no-input', localizeText(context.language, 'disable interactive input'))
    .option('--yes', localizeText(context.language, 'confirm non-interactive operations'))
    .option(
      '--source <source>',
      localizeText(context.language, 'data source: auto, local, or remote'),
      'auto',
    )
    .option('--db <path>', localizeText(context.language, 'local DuckDB path'))
    .option('--request-id <id>', localizeText(context.language, 'caller-supplied correlation ID'))
    .option('--debug', localizeText(context.language, 'enable diagnostic details on stderr'))
    .option('--no-color', localizeText(context.language, 'disable terminal colors'))
    // 自定义错误输出：重定向到 context.stdout 以便格式统一
    .showHelpAfterError(false)
    .exitOverride()
    .configureOutput({
      writeOut: (value) => context.stdout.write(value),
      writeErr: () => undefined,
    });

  // ---- preAction 钩子：在执行任何命令前校验冲突参数 ----
  program.hook('preAction', (_root, action) => {
    const options = action.optsWithGlobals<{ apiKey?: string; apiKeyStdin?: boolean }>();
    // 同时传入 --api-key 和 --api-key-stdin 是互斥的
    if (options.apiKey !== undefined && options.apiKeyStdin === true)
      throw new CliError({
        code: 'CLI_CONFLICTING_ARGUMENTS',
        category: 'validation',
        message: '--api-key and --api-key-stdin cannot be used together.',
        hint: 'Choose exactly one API key input method.',
        retryable: false,
        exitCode: 2,
      });
  });

  // ---- 注册 version 描述符 ----
  const versionDescriptor: CommandDescriptor = {
    id: 'version',
    path: ['version'],
    describe: (language) => translate(language, 'versionDescription'),
    register(root) {
      root
        .command('version')
        .description(this.describe(context.language))
        .action(async () => {
          // 输出版本信息的成功信封
          await renderResult(
            successEnvelope(
              'version',
              { package: metadata.name, version: metadata.version, node: process.version },
              { requestId: context.requestId },
            ),
            context,
          );
        });
    },
  };

  // ---- 注册所有子命令（31 个命令的完整命令树） ----
  versionDescriptor.register(program);
  registerAuthCommands(program, context, metadata, dependencies.authProvider);
  registerConfigCommands(program, context, dependencies.resolvedConfig);

  // 远程命令依赖：认证、基础 URL 和数据库路径
  const remoteDependencies = {
    authProvider: dependencies.authProvider,
    baseUrl: dependencies.fuyaoBaseUrl,
    defaultDbPath: dependencies.platformPaths.defaultDbPath,
  };

  registerSymbolCommands(program, context, remoteDependencies);
  registerMarketCommands(program, context, remoteDependencies);
  registerSpecialCommands(program, context, remoteDependencies);
  registerFinancialCommands(program, context, remoteDependencies);
  registerIndexCommands(program, context, remoteDependencies);
  registerCapabilitiesCommand(program, context);
  registerSchemaCommand(program, context);
  registerSkillsCommands(program, context, dependencies.packageRoot);
  registerUpdateCommand(program, context, metadata, dependencies);
  registerUninstallCommand(program, context, metadata, dependencies);
  registerDoctorCommand(program, context);
  registerDataCommands(program, context, dependencies.platformPaths, {
    ...remoteDependencies,
    cliVersion: metadata.version,
  });
  registerDbCommands(program, context, dependencies.platformPaths.defaultDbPath);
  registerLocalMarketCommands(program, context, dependencies.platformPaths.defaultDbPath);

  return program;
}

/**
 * Converts a Commander-internal error into a classified {@link CliError}.
 * 将 Commander 内部错误转换为已分类的 {@link CliError}。
 *
 * Special-cases `commander.unknownCommand` so the user gets a friendlier
 * localized message instead of the raw Commander output.
 * 特殊处理 `commander.unknownCommand`，使用户获得本地化的友好提示而非 Commander 原始输出。
 *
 * @param error    - The CommanderError thrown by `.exitOverride()`.
 *                   由 `.exitOverride()` 抛出的 CommanderError。
 * @param language - The user's preferred language for error messages.
 *                   用户偏好的错误消息语言。
 * @returns A classified CLI error.
 *          已分类的 CLI 错误。
 */
export function commanderError(error: CommanderError, language: CliContext['language']): CliError {
  const isUnknownCommand = error.code === 'commander.unknownCommand';

  return new CliError({
    // 未知命令和参数错误使用不同的错误码，便于上游区分
    code: isUnknownCommand ? 'CLI_UNKNOWN_COMMAND' : 'CLI_BAD_ARGUMENT',
    category: 'validation',
    message: isUnknownCommand ? translate(language, 'unknownCommand') : error.message,
    hint: translate(language, 'unknownCommandHint'),
    retryable: false,
    exitCode: 2,
  });
}
