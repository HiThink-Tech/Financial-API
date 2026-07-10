/**
 * CLI context — captures runtime environment settings used by every command.
 *
 * CLI 上下文模块 — 捕获每个命令使用的运行时环境设置。
 *
 * The context is created once per process invocation and carries format,
 * language, color mode, a tracing request ID, and I/O stream references
 * so the rendering layer never touches globals.
 * 上下文在每次进程调用时创建一次，携带格式、语言、颜色模式、追踪 request ID
 * 和 I/O 流引用，使渲染层永不触碰全局变量。
 */

import { randomUUID } from 'node:crypto';
import { resolveLanguage, type Language } from './i18n.js';

/**
 * Output format the user selected (or auto-detected).
 * 用户选择的（或自动检测的）输出格式。
 *
 * - `auto`   — sniff terminal capabilities. 自动检测终端能力。
 * - `json`   — pretty-printed JSON. 格式化 JSON。
 * - `ndjson` — newline-delimited JSON streams. 换行分隔 JSON 流。
 * - `csv`    — comma-separated values. 逗号分隔值。
 * - `table`  — ASCII table via `cli-table3`. ASCII 表格。
 */
export type OutputFormat = 'auto' | 'json' | 'ndjson' | 'csv' | 'table';

/**
 * Shared context injected into every command action and the render pipeline.
 * 注入到每个命令 action 和渲染管线的共享上下文。
 */
export interface CliContext {
  /** Selected output format. 选择的输出格式。 */
  format: OutputFormat;
  /** Human-interface language. 界面语言。 */
  language: Language;
  /** Whether ANSI color escape codes should be emitted.
   *  是否应输出 ANSI 颜色转义码。 */
  color: boolean;
  /** Unique request identifier for tracing / debugging.
   *  用于链路追踪/调试的唯一请求标识。 */
  requestId: string;
  /** Standard output stream (redirectable).
   *  标准输出流（可重定向）。 */
  stdout: NodeJS.WriteStream;
  /** Standard error stream (redirectable).
   *  标准错误流（可重定向）。 */
  stderr: NodeJS.WriteStream;
}

/**
 * Extracts the value of a CLI option from the raw argv array.
 * 从原始 argv 数组中提取 CLI 选项的值。
 *
 * Supports both `--name=value` (inline) and `--name value` (space-separated) forms.
 * 支持 `--name=value`（内联）和 `--name value`（空格分隔）两种形式。
 *
 * @param argv - The raw argument array (e.g. `['--format', 'json']`).
 *               原始参数数组（例如 `['--format', 'json']`）。
 * @param name - The option name including dashes (e.g. `'--format'`).
 *               包含短横线的选项名（例如 `'--format'`）。
 * @returns The option value string, or `undefined` if the option was not passed.
 *          选项值字符串，如果未传入该选项则返回 `undefined`。
 */
export function optionValue(argv: readonly string[], name: string): string | undefined {
  // 支持 --name=value 内联形式
  const inlinePrefix = `${name}=`;
  const inline = argv.find((argument) => argument.startsWith(inlinePrefix));
  if (inline !== undefined) {
    return inline.slice(inlinePrefix.length);
  }

  // 支持 --name value 空格分隔形式
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

/**
 * Creates the {@link CliContext} for the current process invocation.
 * 为当前进程调用创建 {@link CliContext}。
 *
 * Reads options from argv, applies defaults, resolves the language, and
 * derives the color flag from the terminal environment.
 * 从 argv 读取选项、应用默认值、解析语言，并从终端环境推导颜色标志。
 *
 * @param argv     - Raw CLI arguments (without the executable path).
 *                   原始 CLI 参数（不含可执行路径）。
 * @param defaults - Optional overrides for format and language (usually from config file).
 *                   可选的格式和语言覆盖项（通常来自配置文件）。
 * @returns A fully populated CLI context.
 *          完全填充的 CLI 上下文。
 */
export function createCliContext(
  argv: readonly string[],
  defaults: { format?: OutputFormat; language?: Language } = {},
): CliContext {
  const rawFormat = optionValue(argv, '--format');
  // 验证格式值的合法性，不合法则回退到默认值
  const format: OutputFormat =
    rawFormat === 'json' || rawFormat === 'ndjson' || rawFormat === 'csv' || rawFormat === 'table'
      ? rawFormat
      : (defaults.format ?? 'auto');

  // 语言解析优先级：CLI 参数 > 配置文件 > 系统 locale 环境变量
  const language = resolveLanguage(
    optionValue(argv, '--lang') ?? defaults.language,
    process.env.LC_ALL ?? process.env.LC_MESSAGES ?? process.env.LANG,
  );

  return {
    format,
    language,
    // 仅在 TTY 终端且未设置 NO_COLOR 时启用颜色
    color: process.stderr.isTTY === true && process.env.NO_COLOR === undefined,
    // requestId: CLI 传入 > 随机 UUID
    requestId: optionValue(argv, '--request-id') ?? randomUUID(),
    stdout: process.stdout,
    stderr: process.stderr,
  };
}

/**
 * Infers the command name from raw argv by skipping known options.
 * 通过跳过已知选项从原始 argv 中推断命令名称。
 *
 * Walks through the argument list, skips recognized `--option value` pairs,
 * and returns the first non-option positional argument.
 * 遍历参数列表，跳过已知的 `--option value` 对，返回第一个非选项的位置参数。
 *
 * @param argv - Raw CLI arguments.
 *              原始 CLI 参数。
 * @returns The inferred command name, or `'root'` if none was found.
 *          推断出的命令名称，如果未找到则返回 `'root'`。
 */
export function inferCommand(argv: readonly string[]): string {
  // 已知需要跟随一个值的选项列表（用于跳过）
  const optionsWithValues = new Set([
    '--format',
    '--lang',
    '--profile',
    '--api-key',
    '--db',
    '--config',
    '--source',
    '--request-id',
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === undefined) continue;

    // 跳过带参数的选项及其值
    if (optionsWithValues.has(argument)) {
      index += 1; // 跳过选项值
      continue;
    }

    // 第一个不以 '-' 开头的参数即为命令名
    if (!argument.startsWith('-')) {
      return argument;
    }
  }

  // 所有参数都是选项，回退到根命令
  return 'root';
}
