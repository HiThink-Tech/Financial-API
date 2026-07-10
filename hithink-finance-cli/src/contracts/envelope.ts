/**
 * Envelope contract — defines the shape of every CLI JSON response.
 *
 * 信封契约模块 — 定义所有 CLI JSON 响应的统一格式（结果信封和错误信封）。
 *
 * Every command result is wrapped in a typed envelope so that consumers (humans
 * or AI agents) always receive a predictable `{ ok, command, ... }` structure.
 * 所有命令结果都封装在带类型的信封中，确保消费者（人类或 AI）始终收到可预测的结构。
 */

import { CliError, type ErrorCategory } from './errors.js';
import { redactText } from '../infrastructure/credentials/redact.js';

/**
 * Metadata attached to every successful result envelope.
 * 挂载在每个成功结果信封上的元数据。
 */
export interface ResultMeta {
  /** Data origin: `local` for DuckDB, `remote` for the upstream API.
   *  数据来源：`local` 表示本地 DuckDB，`remote` 表示远端 API。 */
  source?: 'local' | 'remote';
  /** Number of top-level items in the `data` payload.
   *  `data` 负载中的顶层条目数量。 */
  count?: number;
  /** ISO 8601 timestamp when the data was last refreshed.
   *  数据最近一次刷新的 ISO 8601 时间戳。 */
  asOf?: string;
  /** Adjustment mode applied to prices (e.g. `'qfq'`, `'hfq'`).
   *  价格复权模式（例如 `'qfq'` 前复权，`'hfq'` 后复权）。 */
  adjust?: string;
  /** Whether the result set was limited / truncated by the server.
   *  结果集是否被服务器限制/截断。 */
  truncated: boolean;
  /** Correlation ID for tracing. Can be caller-supplied or auto-generated.
   *  用于链路追踪的关联 ID，可由调用方提供或自动生成。 */
  requestId: string;
  /** Fixed schema version for forward compatibility.
   *  固定 schema 版本号，用于向前兼容。 */
  schemaVersion: '1';
}

/**
 * A successful command envelope carrying typed payload data.
 * 成功的命令信封，携带带类型的负载数据。
 *
 * @typeParam T - The type of the command-specific data payload.
 *               命令专属的数据负载类型。
 */
export interface ResultEnvelope<T> {
  ok: true;
  command: string;
  /** The command-specific response payload.
   *  命令专属的响应负载。 */
  data: T;
  meta: ResultMeta;
}

/**
 * Structured error body surfaced inside an {@link ErrorEnvelope}.
 * 在 {@link ErrorEnvelope} 中呈现的结构化错误体。
 */
export interface ErrorBody {
  /** Stable error code for programmatic consumers (e.g. `'AUTH_EXPIRED'`).
   *  面向编程消费者的稳定错误码（例如 `'AUTH_EXPIRED'`）。 */
  code: string;
  /** Classification bucket used for routing & retry logic.
   *  用于路由和重试逻辑的分类桶。 */
  category: ErrorCategory;
  /** Human-readable error message (credentials redacted).
   *  人类可读的错误消息（已脱敏敏感凭据）。 */
  message: string;
  /** Suggestion for the user on how to recover.
   *  向用户提供的恢复建议。 */
  hint: string;
  /** Whether a retry with the same parameters might succeed.
   *  使用相同参数重试是否可能成功。 */
  retryable: boolean;
  /** Optional correlation ID for tracing.
   *  可选的链路追踪关联 ID。 */
  requestId?: string;
}

/**
 * An error envelope returned when a command cannot produce data.
 * 当命令无法产出数据时返回的错误信封。
 */
export interface ErrorEnvelope {
  ok: false;
  command: string;
  error: ErrorBody;
  meta: {
    /** The CLI version that produced this error.
     *  产生此错误的 CLI 版本号。 */
    cliVersion: string;
    /** Fixed schema version for forward compatibility.
     *  固定 schema 版本号，用于向前兼容。 */
    schemaVersion: '1';
  };
}

/**
 * Discriminated union of all possible command-response envelopes.
 * 所有可能的命令响应信封的可辨识联合类型。
 *
 * @typeParam T - Type of the success payload. Defaults to `unknown`.
 *               成功负载的类型，默认为 `unknown`。
 */
export type Envelope<T = unknown> = ResultEnvelope<T> | ErrorEnvelope;

/**
 * Factory for a successful {@link ResultEnvelope}.
 * 构造成功 {@link ResultEnvelope} 的工厂函数。
 *
 * @typeParam T - The type of the command payload.
 *               命令负载的类型。
 * @param command - Name of the command that produced this result (e.g. `'symbol.search'`).
 *                  产生此结果的命令名称（例如 `'symbol.search'`）。
 * @param data    - The command-specific response data.
 *                  命令专属的响应数据。
 * @param meta    - Partial metadata; `truncated` defaults to `false` and `schemaVersion` is forced to `'1'`.
 *                  部分元数据；`truncated` 默认为 `false`，`schemaVersion` 强制为 `'1'`。
 * @returns A well-formed success envelope.
 *          格式正确的成功信封。
 */
export function successEnvelope<T>(
  command: string,
  data: T,
  meta: Partial<ResultMeta> & Pick<ResultMeta, 'requestId'>,
): ResultEnvelope<T> {
  return {
    ok: true,
    command,
    data,
    meta: {
      ...meta,
      // 补齐默认值，确保 consumer 始终能读取 truncated 字段
      truncated: meta.truncated ?? false,
      schemaVersion: '1',
    },
  };
}

/**
 * Factory for an {@link ErrorEnvelope} from a {@link CliError}.
 * 从 {@link CliError} 构造 {@link ErrorEnvelope} 的工厂函数。
 *
 * @param command    - Name of the command that encountered the error.
 *                     遇到错误的命令名称。
 * @param error      - The classified CLI error.
 *                     已分类的 CLI 错误。
 * @param cliVersion - Current CLI version string (from package.json).
 *                     当前 CLI 版本字符串（来自 package.json）。
 * @returns A well-formed error envelope with redacted messages.
 *          消息已脱敏的格式正确的错误信封。
 */
export function errorEnvelope(command: string, error: CliError, cliVersion: string): ErrorEnvelope {
  // 构建错误体，对 message 和 hint 进行脱敏处理，避免泄露凭据信息
  const body: ErrorBody = {
    code: error.code,
    category: error.category,
    message: redactText(error.message),
    hint: redactText(error.hint),
    retryable: error.retryable,
  };

  // 仅在 requestId 存在时才附加，避免输出空字段
  if (error.requestId !== undefined) {
    body.requestId = error.requestId;
  }

  return {
    ok: false,
    command,
    error: body,
    meta: {
      cliVersion,
      schemaVersion: '1',
    },
  };
}
