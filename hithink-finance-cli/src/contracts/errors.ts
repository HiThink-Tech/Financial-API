/**
 * Classified error types used throughout the CLI.
 *
 * 分类错误类型模块 — 定义 CLI 中使用的所有结构化错误类型。
 *
 * Every error is categorized so the rendering layer and upstream consumers
 * can route / display / retry consistently without parsing ad-hoc strings.
 * 每个错误都经过分类，使渲染层和上游消费者可以一致地路由/显示/重试，无需解析零散字符串。
 */

/**
 * Broad categories that an error can belong to.
 * 错误所属的大类。
 *
 * - `validation`   — bad user input or conflicting flags. 用户输入错误或标志冲突。
 * - `authentication` — missing / expired / invalid credentials. 凭据缺失/过期/无效。
 * - `upstream`     — the remote API returned an error. 远端 API 返回了错误。
 * - `local-data`   — DuckDB / local storage problem. 本地数据库或存储问题。
 * - `internal`     — unexpected runtime error (bug). 意外的运行时错误（缺陷）。
 */
export type ErrorCategory =
  'validation' | 'authentication' | 'upstream' | 'local-data' | 'internal';

/**
 * Exit codes that map to POSIX conventions used by the CLI.
 * CLI 使用的 POSIX 风格退出码。
 *
 * - `0` — success. 成功。
 * - `1` — general / internal error. 通用/内部错误。
 * - `2` — usage / validation error. 使用方式/验证错误。
 * - `3` — authentication error. 认证错误。
 * - `4` — upstream error. 上游 API 错误。
 * - `5` — local data error. 本地数据错误。
 * - `6` — reserved (future use). 保留（未来扩展）。
 */
export type ExitCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export { redactText } from '../infrastructure/credentials/redact.js';

/**
 * Options bag for constructing a {@link CliError}.
 * 构造 {@link CliError} 的选项集合。
 */
export interface CliErrorOptions {
  /** Stable machine-readable error code (e.g. `'AUTH_EXPIRED'`).
   *  稳定的、机器可读的错误码（例如 `'AUTH_EXPIRED'`）。 */
  code: string;
  /** Classification bucket for routing / retry logic.
   *  用于路由和重试逻辑的分类桶。 */
  category: ErrorCategory;
  /** Human-readable error description.
   *  人类可读的错误描述。 */
  message: string;
  /** Actionable recovery suggestion for the user.
   *  面向用户的可操作恢复建议。 */
  hint: string;
  /** Whether the same request might succeed if retried.
   *  相同请求重试后是否可能成功。 */
  retryable: boolean;
  /** POSIX exit code — must NOT be `0` because this is an error.
   *  POSIX 退出码 — 不能为 `0`，因为这是一个错误。 */
  exitCode: Exclude<ExitCode, 0>;
  /** Optional correlation ID for tracing.
   *  可选的链路追踪关联 ID。 */
  requestId?: string;
}

/**
 * Structured CLI error with category, exit code, and localization support.
 * 结构化 CLI 错误，包含分类、退出码和本地化支持。
 *
 * Extends the built-in `Error` so that standard tooling (stack traces,
 * `instanceof` checks) works as expected. The extra fields are consumed
 * by the envelope layer to populate the JSON error envelope.
 * 继承内置 `Error`，使标准工具（堆栈跟踪、`instanceof` 检查）正常工作。
 * 额外字段由信封层消费，用于填充 JSON 错误信封。
 */
export class CliError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly hint: string;
  readonly retryable: boolean;
  readonly exitCode: Exclude<ExitCode, 0>;
  readonly requestId: string | undefined;

  /**
   * @param options - Error classification and presentation details.
   *                  错误的分类和展示细节。
   */
  constructor(options: CliErrorOptions) {
    super(options.message);
    this.name = 'CliError';
    this.code = options.code;
    this.category = options.category;
    this.hint = options.hint;
    this.retryable = options.retryable;
    this.exitCode = options.exitCode;
    this.requestId = options.requestId;
  }
}

/**
 * Normalize any thrown value into a well-formed {@link CliError}.
 * 将任意被抛出的值规范化为格式良好的 {@link CliError}。
 *
 * If the input is already a {@link CliError} it is returned as-is;
 * otherwise the value is wrapped with category `'internal'` and exit code `1`.
 * 如果输入已经是 {@link CliError}，则原样返回；
 * 否则将值包装为 `'internal'` 分类、退出码 `1` 的错误。
 *
 * @param error - Any caught value (Error, string, unknown).
 *                任意被捕获的值（Error、字符串、未知类型）。
 * @returns A classified CLI error suitable for envelope serialization.
 *          适合信封序列化的已分类 CLI 错误。
 */
export function internalError(error: unknown): CliError {
  // 已经是结构化错误，直接返回
  if (error instanceof CliError) {
    return error;
  }

  // 将非结构化异常包装成内部错误，以便统一处理
  return new CliError({
    code: 'CLI_INTERNAL_ERROR',
    category: 'internal',
    message: error instanceof Error ? error.message : 'Unexpected internal error.',
    hint: 'Run the command again with --debug and report the request ID if the error persists.',
    retryable: false,
    exitCode: 1,
  });
}
