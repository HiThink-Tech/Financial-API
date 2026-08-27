/**
 * Fuyao API 客户端模块
 *
 * 封装与 Fuyao 远程金融数据服务的 HTTP 通信，提供统一的请求/响应处理管道。
 * 核心功能包括：
 *
 * 1. 请求构建 — 将路径和查询参数组装为完整 URL
 * 2. 认证 — 通过 X-api-key 头携带 API Key
 * 3. 重试 — 网络错误和可重试业务错误自动重试（指数退避）
 * 4. 响应解析 — JSON 反序列化 + 信封格式校验 + 数据 schema 校验
 * 5. 错误分类 — 将业务错误码映射为结构化 CliError（认证错误/校验错误/上游错误）
 *
 * 重试策略由 retry.ts 模块提供，支持服务器端 Retry-After 头和客户端指数退避。
 *
 * @module fuyao/client
 */

import type { AuthSession } from '../../application/ports/auth-provider.js';
import { cancelledError, CliError, type CliErrorOptions } from '../../contracts/errors.js';
import { fuyaoEnvelopeSchema } from './envelope.js';
import {
  defaultSleep,
  parseRetryAfter,
  RETRYABLE_BUSINESS_CODES,
  RETRYABLE_HTTP_STATUS_CODES,
  retryDelayMs,
} from './retry.js';
import type { ZodType } from 'zod';

/**
 * Fuyao API 请求定义
 *
 * @template T - 响应数据的 Zod schema 类型
 */
export interface FuyaoRequest<T> {
  /** API 路径，相对于 baseUrl */
  path: string;
  /** 查询参数，值为 undefined 的参数会被自动过滤 */
  query?: Record<string, string | number | boolean | undefined>;
  /** 响应数据验证 schema（Zod） */
  schema: ZodType<T>;
}

/**
 * Fuyao API 成功响应
 *
 * @template T - 业务数据类型
 */
export interface FuyaoSuccess<T> {
  /** 解析验证后的业务数据 */
  data: T;
  /** Fuyao 服务端生成的请求追踪 ID（用于问题排查） */
  requestId?: string;
}

/**
 * Fuyao 客户端构造配置
 *
 * 支持依赖注入以方便单元测试和自定义行为。
 */
export interface FuyaoClientOptions {
  /** Fuyao API 基础 URL（如 https://api.example.com） */
  baseUrl: string;
  /** 认证会话（包含 API Key） */
  auth: AuthSession;
  /** 请求超时时间（毫秒），默认 30_000（30秒） */
  timeoutMs?: number;
  /** 最大重试次数，默认 3 */
  maxAttempts?: number;
  /** 可注入的 fetch 实现（默认 globalThis.fetch） */
  fetch?: typeof globalThis.fetch;
  /** 可注入的 sleep 实现（用于重试退避等待，默认 setTimeout 封装） */
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  /** 可注入的随机数生成器（用于退避抖动） */
  random?: () => number;
  /** Optional caller cancellation signal shared by requests and retry waits. */
  signal?: AbortSignal;
}

/**
 * 创建带可选 requestId 的 CliError
 *
 * @param options - CliError 构造选项
 * @param requestId - Fuyao 请求追踪 ID
 * @returns 包含 requestId 的 CliError 实例
 */
function cliError(options: CliErrorOptions, requestId?: string): CliError {
  const complete: CliErrorOptions = { ...options };
  if (requestId !== undefined) complete.requestId = requestId;
  return new CliError(complete);
}

/**
 * 将 Fuyao 业务错误码映射为 CliError
 *
 * Fuyao 错误码分段语义：
 * - 1xxx：客户端参数校验错误（category: validation, exitCode: 2）
 * - 2xxx：认证授权错误（category: authentication, exitCode: 3）
 * - 4xxx/5xxx：服务器端错误（category: upstream, exitCode: 4）
 *   - 部分 4xxx/5xxx 码在 RETRYABLE_BUSINESS_CODES 集合中可重试
 *
 * @param code - Fuyao 业务错误码
 * @param message - 错误描述信息
 * @param requestId - 请求追踪 ID
 * @returns 结构化的 CliError
 */
function businessError(code: number, message: string, requestId?: string): CliError {
  // 2xxx: 认证授权错误（API Key 无效、权限不足等）
  if (code >= 2000 && code < 3000) {
    return cliError(
      {
        code: `FUYAO_${code}`,
        category: 'authentication',
        message,
        hint: 'Run `hithink-finance auth status` and verify API key permissions.',
        retryable: false,
        exitCode: 3,
      },
      requestId,
    );
  }
  // 1xxx: 客户端参数校验错误（缺少参数、参数格式错误等）
  if (code >= 1000 && code < 2000) {
    return cliError(
      {
        code: `FUYAO_${code}`,
        category: 'validation',
        message,
        hint: 'Check the command schema and correct the supplied parameters.',
        retryable: false,
        exitCode: 2,
      },
      requestId,
    );
  }
  // 4xxx/5xxx: 服务器端错误（部分可重试）
  return cliError(
    {
      code: `FUYAO_${code}`,
      category: 'upstream',
      message,
      hint: 'Retry later and retain the request ID when reporting a persistent failure.',
      retryable: RETRYABLE_BUSINESS_CODES.has(code),
      exitCode: 4,
    },
    requestId,
  );
}

function httpError(status: number, requestId?: string): CliError {
  return cliError(
    {
      code: `UPSTREAM_HTTP_${status}`,
      category: 'upstream',
      message: `The Fuyao service returned HTTP ${status}.`,
      hint: 'Retry later and retain the request ID when reporting a persistent failure.',
      retryable: RETRYABLE_HTTP_STATUS_CODES.has(status),
      exitCode: 4,
    },
    requestId,
  );
}

/**
 * Fuyao API 客户端
 *
 * 封装完整的 HTTP 请求生命周期：构建 → 发送 → 重试 → 解析 → 校验 → 错误分类。
 *
 * 使用示例：
 * ```typescript
 * const client = new FuyaoClient({ baseUrl: 'https://api.fuyao.example.com', auth: session });
 * const result = await client.request({
 *   path: '/api/v1/daily',
 *   query: { thscode: '000001.SZ', start: '2024-01-01' },
 *   schema: dailyKlineSchema,
 * });
 * ```
 */
export class FuyaoClient {
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly fetchImplementation: typeof globalThis.fetch;
  private readonly sleep: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  private readonly random: () => number;

  /**
   * @param options - 客户端配置选项
   */
  constructor(private readonly options: FuyaoClientOptions) {
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
  }

  private requestSignal(): AbortSignal {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    return this.options.signal === undefined
      ? timeout
      : AbortSignal.any([this.options.signal, timeout]);
  }

  private async waitBeforeRetry(response: Response | undefined, attempt: number): Promise<void> {
    const retryAfter = parseRetryAfter(response?.headers.get('retry-after') ?? null);
    try {
      await this.sleep(retryAfter ?? retryDelayMs(attempt, this.random), this.options.signal);
    } catch (error) {
      if (this.options.signal?.aborted === true) throw cancelledError();
      throw error;
    }
  }

  /**
   * 发送 Fuyao API 请求并获取已验证的响应数据
   *
   * 完整的请求处理流程：
   * ```
   * 构建 URL（baseUrl + path + query params）
   *   ↓
   * for (attempt in 1..maxAttempts):
   *   ├─ 发送 GET 请求（X-api-key 认证、超时控制）
   *   ├─ 网络错误？
   *   │   ├─ 还有重试次数 → 指数退避等待 → continue
   *   │   └─ 最后一次 → 抛出 UPSTREAM_NETWORK_FAILURE
   *   ├─ JSON 解析失败？
   *   │   └─ 抛出 UPSTREAM_INVALID_RESPONSE
   *   ├─ 信封格式校验失败？
   *   │   └─ 抛出 UPSTREAM_INVALID_RESPONSE (contract mismatch)
   *   ├─ code === 0 成功？
   *   │   ├─ data schema 校验失败 → 抛出 UPSTREAM_INVALID_DATA
   *   │   └─ 成功 → 返回 FuyaoSuccess<T>
   *   └─ code !== 0 业务错误？
   *       ├─ 可重试且还有次数？
   *       │   └─ 检查 Retry-After 头或指数退避等待 → continue
   *       └─ 不可重试 → 抛出 businessError()
   * ```
   *
   * @param request - 请求定义（路径、查询参数、响应 schema）
   * @returns 成功响应，包含已验证的业务数据和请求追踪 ID
   * @throws {CliError} 网络故障、响应格式错误、业务错误等
   */
  async request<T>(request: FuyaoRequest<T>): Promise<FuyaoSuccess<T>> {
    // 构建完整 URL：基础路径 + 查询参数
    const url = new URL(request.path, this.options.baseUrl);
    for (const [key, value] of Object.entries(request.query ?? {})) {
      // 过滤值为 undefined 的查询参数
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    // 重试循环
    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      let response: Response;
      try {
        // 发送 GET 请求，带 API Key 认证头和超时控制
        response = await this.fetchImplementation(url, {
          method: 'GET',
          headers: { 'X-api-key': this.options.auth.apiKey, accept: 'application/json' },
          signal: this.requestSignal(),
        });
      } catch {
        if (this.options.signal?.aborted === true) throw cancelledError();
        // 网络错误（连接失败、超时等）
        if (attempt < this.maxAttempts - 1) {
          // 还有重试次数：指数退避后重试
          await this.waitBeforeRetry(undefined, attempt);
          continue;
        }
        // 所有重试耗尽：抛出网络失败错误
        throw cliError({
          code: 'UPSTREAM_NETWORK_FAILURE',
          category: 'upstream',
          message: 'The Fuyao service could not be reached before the timeout.',
          hint: 'Check network connectivity and retry the command.',
          retryable: true,
          exitCode: 4,
        });
      }

      // 尝试解析 JSON 响应体
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        if (RETRYABLE_HTTP_STATUS_CODES.has(response.status) && attempt < this.maxAttempts - 1) {
          await this.waitBeforeRetry(response, attempt);
          continue;
        }
        if (!response.ok) throw httpError(response.status);
        throw cliError({
          code: 'UPSTREAM_INVALID_RESPONSE',
          category: 'upstream',
          message: 'The Fuyao service returned invalid JSON.',
          hint: 'Retry later and report the failure if it persists.',
          retryable: false,
          exitCode: 4,
        });
      }

      // 校验 Fuyao 标准信封格式（code / message / request_id / data）
      const parsedEnvelope = fuyaoEnvelopeSchema.safeParse(body);
      if (!parsedEnvelope.success) {
        if (RETRYABLE_HTTP_STATUS_CODES.has(response.status) && attempt < this.maxAttempts - 1) {
          await this.waitBeforeRetry(response, attempt);
          continue;
        }
        if (!response.ok) throw httpError(response.status);
        throw cliError({
          code: 'UPSTREAM_INVALID_RESPONSE',
          category: 'upstream',
          message: 'The Fuyao response envelope does not match the supported contract.',
          hint: 'Upgrade the CLI or report a possible upstream contract change.',
          retryable: false,
          exitCode: 4,
        });
      }

      const envelope = parsedEnvelope.data;

      // HTTP transport status takes precedence over a syntactically valid business envelope.
      if (!response.ok) {
        if (RETRYABLE_HTTP_STATUS_CODES.has(response.status) && attempt < this.maxAttempts - 1) {
          await this.waitBeforeRetry(response, attempt);
          continue;
        }
        throw httpError(response.status, envelope.request_id);
      }

      // code === 0 表示业务成功
      if (envelope.code === 0) {
        // 使用 Zod schema 校验业务数据
        const parsedData = request.schema.safeParse(envelope.data);
        if (!parsedData.success) {
          throw cliError(
            {
              code: 'UPSTREAM_INVALID_DATA',
              category: 'upstream',
              message: 'Fuyao data does not match the command response schema.',
              hint: 'Upgrade the CLI or report a possible upstream contract change.',
              retryable: false,
              exitCode: 4,
            },
            envelope.request_id,
          );
        }
        const result: FuyaoSuccess<T> = { data: parsedData.data };
        if (envelope.request_id !== undefined) result.requestId = envelope.request_id;
        return result;
      }

      // code !== 0: 业务错误处理
      const error = businessError(envelope.code, envelope.message, envelope.request_id);

      // 可重试的业务错误且还有重试次数
      if (RETRYABLE_BUSINESS_CODES.has(envelope.code) && attempt < this.maxAttempts - 1) {
        // 优先使用有上限的服务器端 Retry-After，否则使用客户端指数退避
        await this.waitBeforeRetry(response, attempt);
        continue;
      }
      throw error;
    }

    // 所有重试耗尽（理论上不会到达，因为最后一次会直接 throw）
    throw cliError({
      code: 'UPSTREAM_NETWORK_FAILURE',
      category: 'upstream',
      message: 'The Fuyao request failed after all attempts.',
      hint: 'Retry later.',
      retryable: true,
      exitCode: 4,
    });
  }
}
