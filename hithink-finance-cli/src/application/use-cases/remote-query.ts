/**
 * 远程查询用例 — 将 CLI 输入参数映射为 Fuyao API 请求并执行。
 *
 * ## 时间窗口分片机制（用于跨多年的历史查询）
 *
 * Fuyao API 对某些端点有 10 年窗口限制（`window: 'ten-years'`）。
 * 当用户请求的时间跨度超过此限制时，`executeRemoteQuery` 会：
 *
 * 1. 调用 `sliceTimeWindow(start, end)` 将时间段切分为多个 ≤10 年的切片
 * 2. 对每个切片发起独立请求
 * 3. 通过 `mergeWindowData` 合并所有响应：
 *    - 提取每个响应的 `item` 数组
 *    - 扁平化合并 → `deduplicateAndSort`（按 `date_ms` 去重排序）
 *    - 取最后一个响应的其他字段作为外层的元数据
 *
 * 这种分片 + 合并策略确保了超长时间范围查询的正确性和完整性。
 *
 * ## 输入映射机制（queryFor）
 * CLI 选项（kebab-case）通过 `optionKey()` 转换为驼峰参数名，
 * 再映射为 API 查询参数（`queryName` 优先，fallback 到驼峰名）。
 */
import type { RemoteCapabilityDescriptor } from '../../contracts/remote-capabilities.js';
import type { FuyaoClient, FuyaoSuccess } from '../../infrastructure/fuyao/client.js';
import { deduplicateAndSort, sliceTimeWindow } from '../../infrastructure/fuyao/windowing.js';

/**
 * 将 CLI 选项的 flags 字符串转换为驼峰参数名。
 *
 * 例如：
 *   "--start-date, -s"   → "startDate"
 *   "--no-adjust"        → "adjust"
 *
 * @param flags - CLI 选项的 flags（如 "--start-date, -s"）
 * @returns 驼峰形式的参数名
 */
function optionKey(flags: string): string {
  // 取第一个 -- 开头的长选项
  const longFlag = flags.split(/[ ,|]+/u).find((part) => part.startsWith('--')) ?? flags;
  return longFlag
    .replace(/^--/u, '') // 去除 --
    .replace(/^no-/u, '') // 去除 no- 前缀（布尔取反）
    .replace(/-([a-z])/gu, (_match, letter: string) => letter.toUpperCase()); // kebab → camelCase
}

/**
 * 将 CLI 输入映射为 Fuyao API 查询参数。
 *
 * 遍历 capability.options 列表：
 * 1. 通过 optionKey 从 input 中提取对应值
 * 2. 只传递 string/number/boolean 类型的值
 * 3. 使用 queryName（如果定义）作为最终参数名，否则使用驼峰 key
 *
 * 特殊处理：
 * - market.history / index.history → 强制 interval='1d'
 *
 * @param capability - 远程能力描述符
 * @param input      - CLI 解析后的输入参数对象
 * @returns 构建好的查询参数对象
 */
function queryFor(
  capability: RemoteCapabilityDescriptor,
  input: Record<string, unknown>,
): Record<string, string | number | boolean | undefined> {
  const query: Record<string, string | number | boolean | undefined> = {};
  for (const option of capability.options) {
    const key = optionKey(option.flags);
    const value = input[key];
    // 只接受基本类型值，忽略对象/数组等复杂类型
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      query[option.queryName ?? key] = value;
    }
  }
  // 历史查询强制使用日线间隔
  if (capability.id === 'market.history' || capability.id === 'index.history') {
    query.interval = '1d';
  }
  return query;
}

/**
 * 合并多个时间窗口分片请求的响应数据。
 *
 * 合并策略：
 * 1. 从所有响应中提取对象
 * 2. 扁平化每个对象中的 `item` 数组
 * 3. 按 `date_ms` 字段去重排序（fallback：JSON.stringify 全量比较）
 * 4. 取最后一个响应的外层字段（如 requestId）保留在合并结果中
 *
 * @param values - 多窗口响应的 data 数组
 * @returns 合并后的数据对象
 */
function mergeWindowData(values: unknown[]): unknown {
  // 过滤出对象类型的值
  const objects = values.filter(
    (value): value is Record<string, unknown> => value !== null && typeof value === 'object',
  );
  // 提取并扁平化所有 item 数组
  const items = objects.flatMap((value) => (Array.isArray(value.item) ? value.item : []));
  // 去重 + 排序：优先使用 date_ms 字段，fallback 到 JSON 全量比较
  const mergedItems = deduplicateAndSort(items, (item) => {
    if (item !== null && typeof item === 'object' && 'date_ms' in item) {
      const date = item.date_ms;
      if (typeof date === 'number' || typeof date === 'string') return date;
    }
    return JSON.stringify(item);
  });
  // 保留最后一个响应中的元数据字段
  return { ...(objects[objects.length - 1] ?? {}), item: mergedItems };
}

/**
 * 执行远程 API 查询。
 *
 * ## 执行流程：
 * 1. 通过 queryFor 将 CLI 输入映射为 API 参数
 * 2. 检查是否需要时间窗口分片：
 *    - capability.window === 'ten-years' 且请求时间跨度超过 10 年 → 分片处理
 *    - 否则 → 单次请求
 * 3. 分片模式：循环发起请求 → mergeWindowData 合并结果
 * 4. 保留最后一个分片响应的 requestId
 *
 * @param capability - 远程能力描述符（endpoint, options, window 等）
 * @param input      - CLI 输入参数
 * @param client     - Fuyao HTTP 客户端
 * @returns API 响应（data + 可选的 requestId）
 */
export async function executeRemoteQuery(
  capability: RemoteCapabilityDescriptor,
  input: Record<string, unknown>,
  client: FuyaoClient,
): Promise<FuyaoSuccess<unknown>> {
  // 构建 API 查询参数
  const query = queryFor(capability, input);
  const start = input.startMs;
  const end = input.endMs;
  // 时间窗口分片：仅对 ten-years 端点的超长时间范围做分片
  if (capability.window === 'ten-years' && typeof start === 'number' && typeof end === 'number') {
    const slices = sliceTimeWindow(start, end);
    if (slices.length > 1) {
      // 分片循环：对每个时间切片发起独立请求
      const responses: FuyaoSuccess<unknown>[] = [];
      for (const slice of slices) {
        responses.push(
          await client.request({
            path: capability.endpoint,
            query: { ...query, start: slice.start, end: slice.end },
            schema: capability.outputSchema,
          }),
        );
      }
      // 合并所有分片的 data
      const result: FuyaoSuccess<unknown> = {
        data: mergeWindowData(responses.map((response) => response.data)),
      };
      // 保留最后一个分片的 requestId
      const requestId = responses.at(-1)?.requestId;
      if (requestId !== undefined) result.requestId = requestId;
      return result;
    }
  }

  // 单次请求：不需要分片
  return client.request({
    path: capability.endpoint,
    query,
    schema: capability.outputSchema,
  });
}
