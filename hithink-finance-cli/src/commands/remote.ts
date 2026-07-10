/**
 * 远程能力命令注册模块
 *
 * 负责将 {@link RemoteCapabilityDescriptor} 动态注册为 Commander.js 命令。
 * 核心职责：
 * 1. 将能力描述符中的 options 映射为 CLI 选项（通过 {@link addDescriptorOption}）
 * 2. 处理多源股票代码输入（--thscodes、--codes-file、--codes-stdin）
 * 3. 实现 market.history 命令的本地优先回退逻辑（local-first fallback）
 * 4. 非 market.history 命令直接走远程 Fuyao API 查询
 * 5. 根据 {@link chooseSource} 的 source-policy 路由请求到本地 DuckDB 或远程 API
 *
 * 注册时按照 command group 名称（market / financials / index / special / symbol）
 * 过滤能力列表后批量注册子命令。
 */

import { InvalidArgumentError, Option, type Command } from 'commander';
import type { CliContext } from '../cli/context.js';
import { localizeText } from '../cli/i18n.js';
import type { RemoteCapabilityDescriptor } from '../contracts/remote-capabilities.js';
import { successEnvelope } from '../contracts/envelope.js';
import { CliError } from '../contracts/errors.js';
import { executeRemoteQuery } from '../application/use-cases/remote-query.js';
import type { ApiKeyAuthProvider } from '../infrastructure/credentials/api-key-provider.js';
import { FuyaoClient } from '../infrastructure/fuyao/client.js';
import { renderResult } from '../output/renderer.js';
import { chooseSource, type DataSource } from '../application/source-policy.js';
import { openDatabase } from '../infrastructure/duckdb/connection.js';
import { getHistory } from '../application/use-cases/market-history.js';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readStdin } from '../infrastructure/filesystem/stdin.js';
import { renderJson } from '../output/json.js';

/**
 * 远程命令注册所需的依赖项集合
 *
 * 由 CLI 启动时组装，传递给各个命令组注册函数。
 */
export interface RemoteCommandDependencies {
  /** API Key 认证提供者，用于解析和获取有效的 API Key */
  authProvider: ApiKeyAuthProvider;
  /** Fuyao API 的基础 URL */
  baseUrl: string;
  /** 默认的本地 DuckDB 数据库文件路径 */
  defaultDbPath: string;
}

/**
 * 安全整数解析器，用于 Commander Option.argParser
 *
 * 将用户输入的字符串转换为安全整数，若无法转换则抛出 {@link InvalidArgumentError}。
 *
 * @param value - 用户输入的字符串值
 * @returns 解析后的安全整数
 * @throws {InvalidArgumentError} 如果值不是安全整数
 */
function integer(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new InvalidArgumentError('expected a safe integer');
  return parsed;
}

/**
 * 将单个能力描述符的 option 注册到 Commander 命令上
 *
 * 根据 {@link RemoteCapabilityDescriptor} 中定义的 option 类型：
 * - `integer` 类型绑定 {@link integer} 解析器
 * - `--thscodes` 选项支持逗号拼接多次传入的值
 * - 有预设选项时添加 `.choices()` 约束
 * - 有默认值时设置 `.default()`
 * - 必填选项标记为 `.makeOptionMandatory()`
 *
 * @param command - 目标 Commander 命令实例
 * @param descriptor - 能力描述符中的单个 option 定义
 */
function addDescriptorOption(
  command: Command,
  descriptor: RemoteCapabilityDescriptor['options'][number],
  context: CliContext,
): void {
  const option = new Option(
    descriptor.flags,
    localizeText(context.language, descriptor.description),
  );
  if (descriptor.type === 'integer') option.argParser(integer);
  // --thscodes 支持多次传入并自动逗号拼接
  if (descriptor.flags.startsWith('--thscodes '))
    option.argParser((value: string, previous: string | undefined) =>
      previous === undefined ? value : `${previous},${value}`,
    );
  if (descriptor.choices !== undefined) option.choices([...descriptor.choices]);
  if (descriptor.defaultValue !== undefined) option.default(descriptor.defaultValue);
  if (descriptor.required === true) option.makeOptionMandatory();
  command.addOption(option);
}

/**
 * 合并多个来源的股票代码并去重
 *
 * 支持三种输入来源：
 * 1. `--thscodes` CLI 选项（直接传入的代码，可能含逗号分隔）
 * 2. `--codes-file` 文件中的代码（文件内容，可能含换行或逗号分隔）
 * 3. `--codes-stdin` 标准输入中的代码
 *
 * 所有来源的代码会按空白字符和逗号分割、去除首尾空格、过滤空值后，
 * 去重并重新用逗号拼接为单个字符串。
 *
 * @param inputs - 多个来源的原始代码字符串，可能为 undefined
 * @returns 去重后逗号拼接的代码字符串，如果所有输入都为空则返回 undefined
 */
function normalizedCodes(...inputs: Array<string | undefined>): string | undefined {
  const codes = inputs
    .flatMap((input) => input?.split(/[\s,]+/u) ?? [])
    .map((code) => code.trim())
    .filter(Boolean);
  return codes.length === 0 ? undefined : [...new Set(codes)].join(',');
}

async function writeOutputEnvelope(outputPath: string, envelope: unknown): Promise<string> {
  const absolutePath = path.resolve(process.cwd(), outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, renderJson(envelope), 'utf8');
  return absolutePath;
}

/**
 * 注册一个远程能力命令组
 *
 * 这是远程命令注册的核心入口。工作流程：
 *
 * 1. 创建 `program <groupName>` 命令组
 * 2. 遍历每个 {@link RemoteCapabilityDescriptor}，为其创建子命令（leaf command）
 * 3. 将描述符中的 options 通过 {@link addDescriptorOption} 映射为 CLI 选项
 * 4. 若能力支持多个股票代码，额外添加 `--codes-file` 和 `--codes-stdin` 选项
 * 5. 为每个子命令绑定 action 处理函数
 *
 * ### 多源股票代码输入处理
 * action 内部首先检查三种代码输入来源的冲突：
 * - `--codes-stdin` 与 `--api-key-stdin` 不能同时使用（stdin 只能用于一种用途）
 * - `--codes-file` 与 `--codes-stdin` 不能同时使用
 * 然后通过 {@link normalizedCodes} 合并所有代码来源。
 *
 * ### market.history 本地优先回退逻辑
 * 对于 `market.history` 命令，action 中实现特殊的 local-first 流程：
 * 1. 检查本地 DuckDB 是否存在
 * 2. 若存在，查询数据库中已有数据的时间覆盖范围
 * 3. 如果本地数据完全覆盖用户请求的时间窗口，直接从本地查询并返回
 * 4. 如果本地数据不完整，则回退到远程 Fuyao API
 * 5. 如果本地数据库不存在，记入 source-policy 但不影响路由（由 chooseSource 决定）
 *
 * ### 其他命令的 source 路由决策树
 * 对于非 market.history 命令：
 * - 如果用户显式指定 `--source=local`，调用 {@link chooseSource} 进行本地健康检查
 *   - 根据 capability.command[0] 推断 kind（financials / index / special / calendar / snapshot）
 *   - 如果本地不可用，chooseSource 会抛出 CliError
 * - 默认 `auto` 或显式 `remote` 则直接走 Fuyao API 远程查询
 *
 * ### 远程查询流程
 * 通过 {@link dependencies.authProvider} 解析 API Key 后，
 * 使用 {@link FuyaoClient} 调用 {@link executeRemoteQuery} 执行查询，
 * 最后通过 {@link renderResult} 渲染结果。
 *
 * @param program - Commander 根程序实例
 * @param groupName - 命令组名称（如 'market'、'financials'）
 * @param capabilities - 该组的能力描述符列表
 * @param context - CLI 上下文
 * @param dependencies - 远程命令所需依赖项
 */
export function registerRemoteCapabilityGroup(
  program: Command,
  groupName: string,
  capabilities: readonly RemoteCapabilityDescriptor[],
  context: CliContext,
  dependencies: RemoteCommandDependencies,
): void {
  const group = program
    .command(groupName)
    .description(localizeText(context.language, `${groupName} remote data commands`));
  for (const capability of capabilities) {
    const leaf = group
      .command(capability.command[1])
      .description(localizeText(context.language, capability.description));
    for (const option of capability.options) addDescriptorOption(leaf, option, context);
    leaf.option(
      '--output <path>',
      localizeText(context.language, 'write the full JSON response envelope to a file'),
    );
    // 检查该能力是否接受多个股票代码作为输入
    const acceptsMultipleCodes = capability.options.some((option) =>
      option.flags.startsWith('--thscodes '),
    );
    if (acceptsMultipleCodes) {
      // 为支持批量代码的能力添加文件和标准输入两种额外输入方式
      leaf.option(
        '--codes-file <path>',
        localizeText(context.language, 'read thscodes from a comma/newline-delimited file'),
      );
      leaf.option('--codes-stdin', localizeText(context.language, 'read thscodes from stdin'));
    }
    leaf.action(async () => {
      const raw = leaf.opts<{
        thscodes?: string;
        codesFile?: string;
        codesStdin?: boolean;
        output?: string;
      }>();
      const stdinGlobals = leaf.optsWithGlobals<{ apiKeyStdin?: boolean }>();
      // 检查 stdin 用途冲突：--codes-stdin 和 --api-key-stdin 不能同时使用
      if (raw.codesStdin === true && stdinGlobals.apiKeyStdin === true)
        throw new CliError({
          code: 'CLI_CONFLICTING_ARGUMENTS',
          category: 'validation',
          message: '--codes-stdin and --api-key-stdin cannot be used together.',
          hint: 'Store the key with `auth login --api-key-stdin`, then pipe codes.',
          retryable: false,
          exitCode: 2,
        });
      // 检查代码输入方式冲突：文件输入和标准输入不能同时使用
      if (raw.codesFile !== undefined && raw.codesStdin === true)
        throw new CliError({
          code: 'CLI_CONFLICTING_ARGUMENTS',
          category: 'validation',
          message: '--codes-file and --codes-stdin cannot be used together.',
          hint: 'Choose one batch-code input method.',
          retryable: false,
          exitCode: 2,
        });
      // 读取文件中的代码
      const fileCodes =
        raw.codesFile === undefined ? undefined : await readFile(raw.codesFile, 'utf8');
      // 读取标准输入的代码
      const stdinCodes = raw.codesStdin === true ? await readStdin() : undefined;
      const schemaInput: Record<string, unknown> = { ...raw };
      delete schemaInput.codesFile;
      delete schemaInput.codesStdin;
      delete schemaInput.output;
      // 合并所有来源的股票代码并去重
      const combinedCodes = normalizedCodes(raw.thscodes, fileCodes, stdinCodes);
      if (combinedCodes !== undefined) schemaInput.thscodes = combinedCodes;
      const parsed = capability.inputSchema.safeParse(schemaInput);
      if (!parsed.success) {
        throw new CliError({
          code: 'CLI_BAD_ARGUMENT',
          category: 'validation',
          message: parsed.error.issues.map((issue) => issue.message).join('; '),
          hint: `Run \`hithink-finance ${capability.command.join(' ')} --help\` and correct the arguments.`,
          retryable: false,
          exitCode: 2,
        });
      }
      const globals = leaf.optsWithGlobals<{
        profile?: string;
        apiKey?: string;
        apiKeyStdin?: boolean;
        source?: DataSource;
        db?: string;
      }>();
      const explicitApiKey =
        globals.apiKeyStdin === true ? (await readStdin()).trim() : globals.apiKey;
      const requested = globals.source ?? 'auto';

      // ========== market.history 特有：本地优先回退逻辑 ==========
      if (capability.id === 'market.history') {
        const input = parsed.data as {
          thscode: string;
          startMs: number;
          endMs: number;
          adjust: 'none' | 'forward' | 'backward';
        };
        const databasePath =
          globals.db ?? process.env.HITHINK_FINANCE_DB_PATH ?? dependencies.defaultDbPath;
        // 检查本地数据库是否存在
        const exists = await stat(databasePath)
          .then((value) => value.isFile())
          .catch(() => false);
        let coversWindow = false;
        if (exists) {
          const opened = await openDatabase(databasePath);
          try {
            const start = new Date(input.startMs).toISOString().slice(0, 10);
            const end = new Date(input.endMs).toISOString().slice(0, 10);
            // 查询本地 K 线数据的时间覆盖范围
            const coverage = await opened.connection.runAndReadAll(
              'SELECT min(date)::VARCHAR,max(date)::VARCHAR FROM raw_kline_daily',
            );
            const row = coverage.getRowsJson()[0];
            // 判断本地数据是否完全覆盖请求的时间窗口
            coversWindow = String(row?.[0] ?? '') <= start && String(row?.[1] ?? '') >= end;
            const source = chooseSource(
              { kind: 'history', requested, symbolCount: 1 },
              { exists, coversWindow },
            );
            // 如果 source-policy 决定使用本地数据，直接从 DuckDB 查询并返回
            if (source === 'local') {
              const rows = await getHistory(opened.connection, {
                thscodes: [input.thscode],
                start,
                end,
                adjust: input.adjust,
              });
              const envelope = successEnvelope(capability.id, rows, {
                source: 'local',
                requestId: context.requestId,
                count: rows.length,
              });
              if (raw.output !== undefined) {
                const outputPath = await writeOutputEnvelope(raw.output, envelope);
                await renderResult(
                  successEnvelope(
                    capability.id,
                    { path: outputPath, format: 'json', count: rows.length },
                    {
                      source: 'local',
                      requestId: context.requestId,
                      count: rows.length,
                    },
                  ),
                  context,
                );
              } else {
                await renderResult(envelope, context);
              }
              return;
            }
          } finally {
            opened.close();
          }
        } else {
          // 本地数据库不存在，记入 source-policy 但不影响路由
          chooseSource({ kind: 'history', requested, symbolCount: 1 }, { exists, coversWindow });
        }
      } else if (requested === 'local') {
        // 非 market.history 命令显式指定了 --source=local
        // 根据命令组推断 query kind 并进行本地健康检查
        chooseSource(
          {
            kind:
              capability.command[0] === 'financials'
                ? 'financials'
                : capability.command[0] === 'index'
                  ? 'index'
                  : capability.command[0] === 'special'
                    ? 'special'
                    : capability.command[1] === 'calendar'
                      ? 'calendar'
                      : 'snapshot',
            requested,
          },
          { exists: false, coversWindow: false },
        );
      }

      // ========== 远程 Fuyao API 查询流程 ==========
      // 解析 API Key（支持 CLI 选项、stdin、环境变量、凭据存储等来源）
      const auth = await dependencies.authProvider.resolve(
        globals.profile ?? 'default',
        explicitApiKey,
      );
      // 执行远程查询
      const result = await executeRemoteQuery(
        capability,
        parsed.data,
        new FuyaoClient({ baseUrl: dependencies.baseUrl, auth }),
      );
      // 如果返回数据包含 item 数组字段，提取 count 元数据
      const count =
        result.data !== null &&
        typeof result.data === 'object' &&
        'item' in result.data &&
        Array.isArray(result.data.item)
          ? result.data.item.length
          : undefined;
      const meta = {
        source: 'remote' as const,
        requestId: result.requestId ?? context.requestId,
        ...(count === undefined ? {} : { count }),
      };
      const envelope = successEnvelope(capability.id, result.data, meta);
      if (raw.output !== undefined) {
        const outputPath = await writeOutputEnvelope(raw.output, envelope);
        await renderResult(
          successEnvelope(capability.id, { path: outputPath, format: 'json', count }, meta),
          context,
        );
        return;
      }
      await renderResult(envelope, context);
    });
  }
}
