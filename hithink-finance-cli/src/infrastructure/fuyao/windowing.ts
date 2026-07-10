/**
 * 时间窗口分片与数据去重排序工具模块
 *
 * 提供两个核心工具函数：
 *
 * 1. **时间窗口分片** — 将一个大的时间范围切成多个小的时间片
 *    - 用于处理 API 对单次请求时间跨度的限制（如每次最多查 10 年数据）
 *    - 默认片大小为 10 年（考虑闰年：365.25 天/年）
 *
 * 2. **数据去重排序** — 对多片请求合并后的数据进行去重和排序
 *    - 多片请求可能返回重叠数据（边界重复），需要去重
 *    - 使用 Map 按 key 去重，最后按 key 排序
 *
 * @module fuyao/windowing
 */

/** 10 年的毫秒数（考虑闰年：365.25 天/年） */
export const TEN_YEARS_MS = Math.floor(10 * 365.25 * 24 * 60 * 60 * 1000);

/**
 * 时间片描述
 *
 * 使用毫秒级 Unix 时间戳的闭区间 [start, end] 表示。
 */
export interface TimeSlice {
  /** 时间片起始时间戳（毫秒，闭区间） */
  start: number;
  /** 时间片结束时间戳（毫秒，闭区间） */
  end: number;
}

/**
 * 将时间窗口按固定大小切分为多个时间片
 *
 * 切分算法：
 * ```
 * cursor = start
 * while cursor <= end:
 *   sliceEnd = min(cursor + size, end)
 *   输出 [cursor, sliceEnd]
 *   cursor = sliceEnd + 1
 * ```
 *
 * 相邻时间片在边界上相差 1 毫秒（[a, b] 和 [b+1, c]），
 * 确保覆盖整个时间范围且无重叠。
 *
 * @param start - 窗口起始时间戳（毫秒，闭区间）
 * @param end - 窗口结束时间戳（毫秒，闭区间）
 * @param size - 每个时间片的大小，默认 TEN_YEARS_MS（约10年）
 * @returns 时间片数组
 * @throws {RangeError} 参数无效（非安全整数、end < start、size < 1）
 */
export function sliceTimeWindow(start: number, end: number, size = TEN_YEARS_MS): TimeSlice[] {
  // 参数校验：必须是安全整数、end >= start、size >= 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start || size < 1) {
    throw new RangeError('Invalid time window.');
  }
  const slices: TimeSlice[] = [];
  let cursor = start;
  // 从起点开始，逐步滑动窗口
  while (cursor <= end) {
    // 当前片的结束位置 = min(起点+片大小, 总窗口结束)
    const sliceEnd = Math.min(cursor + size, end);
    slices.push({ start: cursor, end: sliceEnd });
    // 下一片从当前片的结束位置 + 1ms 开始（闭区间不重叠）
    cursor = sliceEnd + 1;
  }
  return slices;
}

/**
 * 对数据列表进行去重和排序
 *
 * 使用场景：多个时间片请求可能返回重叠数据（如查询 [Jan 1, Jan 10] 和 [Jan 10, Jan 20]
 * 可能都包含 1月10日的数据），需要按 key 去重。
 *
 * 去重策略：
 * - 使用 Map 按 key 值去重（后面的值覆盖前面的值）
 * - 去重后按 key 值进行排序
 *
 * 复杂度：
 * - 时间：O(n log n)（排序主导）
 * - 空间：O(n)（Map 存储唯一值）
 *
 * @param values - 可能包含重复的数据列表
 * @param key - 提取排序/去重键的函数
 * @returns 去重并按 key 升序排列的新数组
 */
export function deduplicateAndSort<T>(
  values: readonly T[],
  key: (value: T) => string | number,
): T[] {
  // Map 按 key 去重：相同的 key 只保留最后一个值
  const unique = new Map<string | number, T>();
  for (const value of values) unique.set(key(value), value);
  // 按 key 升序排列
  return [...unique.values()].sort((left, right) => {
    const leftKey = key(left);
    const rightKey = key(right);
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}
