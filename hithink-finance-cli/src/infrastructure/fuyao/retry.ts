/**
 * Fuyao API 重试策略模块
 *
 * 提供 API 请求失败时的自动重试机制，包含两种退避策略：
 *
 * 1. **客户端指数退避 (Exponential Backoff)**
 *    公式：base = min(1000 * 2^attempt, 8000)
 *          delay = base + base * 0.2 * random()
 *
 *    参数说明：
 *    - `1000 * 2^attempt`：指数增长的基础延迟（第1次1秒, 第2次2秒, 第3次4秒）
 *    - `min(..., 8000)`：延迟上限为 8 秒，避免等待时间过长
 *    - `base * 0.2 * random()`：±20% 的随机抖动（Jitter），防止"惊群效应"
 *      即多个客户端在同一时刻同时重试压垮服务器
 *
 *    例如 random=0.5 时的延迟：
 *    - attempt 0: 1000 + 100 = 1100ms
 *    - attempt 1: 2000 + 200 = 2200ms
 *    - attempt 2: 4000 + 400 = 4400ms
 *    - attempt 3: 8000 + 800 = 8800ms（达到上限）
 *
 * 2. **服务器端 Retry-After 头**
 *    如果服务器响应包含 Retry-After HTTP 头，优先使用服务器指示的等待时间。
 *    - 数字值：秒数（如 `Retry-After: 120` = 等待120秒）
 *    - HTTP 日期：绝对时间（如 `Retry-After: Wed, 21 Oct 2015 07:28:00 GMT`）
 *
 * 可重试的业务错误码集合在 RETRYABLE_BUSINESS_CODES 中维护。
 *
 * @module fuyao/retry
 */

/**
 * 可重试的业务错误码集合
 *
 * - 4001：服务暂时不可用
 * - 5001/5002/5003：内部服务器错误（可能自行恢复）
 */
export const RETRYABLE_BUSINESS_CODES = new Set([4001, 5001, 5002, 5003]);
export const RETRYABLE_HTTP_STATUS_CODES = new Set([429, 502, 503, 504]);
export const MAX_RETRY_AFTER_MS = 30_000;

/**
 * 解析 HTTP Retry-After 响应头
 *
 * 支持两种 Retry-After 格式：
 * - **秒数格式**：`Retry-After: 120` — 表示等待 120 秒
 * - **日期格式**：`Retry-After: Wed, 21 Oct 2015 07:28:00 GMT` — 表示等到该时间
 *
 * @param value - Retry-After 头的原始值，null 表示无此头
 * @param now - 当前时间戳（毫秒），用于计算日期格式的剩余等待时间
 * @returns 等待毫秒数，无法解析时返回 undefined
 */
export function parseRetryAfter(
  value: string | null,
  now = Date.now(),
  maximumMs = MAX_RETRY_AFTER_MS,
): number | undefined {
  if (value === null) return undefined;
  // 尝试解析为秒数
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0)
    return Math.min(Math.round(seconds * 1000), maximumMs);
  // 尝试解析为 HTTP 日期格式
  const date = Date.parse(value);
  // 返回从现在到目标时间的毫秒数（最小为 0）
  return Number.isNaN(date) ? undefined : Math.min(Math.max(0, date - now), maximumMs);
}

/**
 * 计算指数退避延迟（含随机抖动）
 *
 * 指数退避公式详解：
 * ```
 * base = min(1000 × 2^attempt, 8000)    ← 指数增长，上限 8 秒
 * delay = base + base × 0.2 × random()  ← 添加 ±20% 随机抖动
 * ```
 *
 * 为什么需要随机抖动（Jitter）？
 * - 如果多个客户端同时失败，纯指数退避会让它们在同一时刻重试
 * - 添加随机抖动使重试时间分散，避免对服务器造成同步的请求洪峰
 * - 这种模式称为"惊群效应"（Thundering Herd）缓解
 *
 * @param attempt - 当前重试次数（从 0 开始）
 * @param random - 随机数生成器（返回 [0, 1) 的值）
 * @returns 等待延迟（毫秒，已取整）
 */
export function retryDelayMs(attempt: number, random: () => number): number {
  // base: 指数增长的基础延迟
  // attempt 0 → 1000ms, 1 → 2000ms, 2 → 4000ms, 3+ → 8000ms（上限）
  const base = Math.min(1000 * 2 ** attempt, 8000);
  // 添加 0% ~ 20% 的随机抖动
  return Math.round(base + base * 0.2 * random());
}

/**
 * 默认的异步等待实现
 *
 * 封装 setTimeout 为 Promise，供 sleep 参数使用。
 * 可在测试中替换为伪造实现以加速测试执行。
 *
 * @param milliseconds - 等待的毫秒数
 */
export async function defaultSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  await delay(milliseconds, undefined, signal === undefined ? undefined : { signal });
}
import { setTimeout as delay } from 'node:timers/promises';
