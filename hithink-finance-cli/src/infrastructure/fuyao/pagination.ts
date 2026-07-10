/**
 * API 结果分页处理模块
 *
 * 提供通用的异步分页遍历逻辑，用于处理 Fuyao API 的分页响应。
 * 支持三种限流方式来控制数据量：
 *
 * 1. maxPages — 限制最大翻页数
 * 2. maxRows — 限制最大返回行数（更精确的行级控制）
 * 3. streamed — 流式模式（仅标识，不限流）
 *
 * 三种限流方式至少需要指定一种，否则会抛出 CLI_PAGINATION_BOUND_REQUIRED 错误。
 * 当实际数据超过限制时，`truncated` 字段为 true，表示输出可能不完整。
 *
 * @module fuyao/pagination
 */

import { CliError } from '../../contracts/errors.js';

/**
 * 单页数据响应
 *
 * @template T - 数据项类型
 */
export interface Page<T> {
  /** 当前页的数据项列表 */
  items: T[];
  /** 是否还有后续页 */
  hasMore: boolean;
}

/**
 * 分页控制选项
 *
 * 三种限流方式：
 * - maxPages：最多翻多少页
 * - maxRows：最多返回多少行数据
 * - streamed：是否以流式输出（不限制数据量）
 */
export interface PaginationOptions {
  /** 最大页数限制 */
  maxPages?: number;
  /** 最大行数限制 */
  maxRows?: number;
  /** 是否为流式模式 */
  streamed?: boolean;
}

/**
 * 分页遍历结果
 *
 * @template T - 数据项类型
 */
export interface PaginationResult<T> {
  /** 收集到的所有数据项 */
  items: T[];
  /** 数据是否被截断（实际数据多于返回数据） */
  truncated: boolean;
  /** 实际访问的页数 */
  pages: number;
}

/**
 * 通用分页遍历函数
 *
 * 遍历逻辑：
 * ```
 * pageNumber = 0
 * while (true):
 *   ├─ 检查 maxPages 限制：超过则截断标记并退出
 *   ├─ 调用 fetchPage(pageNumber) 获取下一页
 *   ├─ 计算剩余容量：maxRows - items.length（无 maxRows 时为 page.items.length）
 *   ├─ 剩余容量 <= 0：截断标记并退出
 *   ├─ 追加数据（最多 remaining 条）
 *   ├─ 当前页数据超出剩余容量：截断标记并退出
 *   ├─ hasMore === false：正常退出
 *   └─ maxRows 已达上限：截断标记并退出
 * ```
 *
 * @param fetchPage - 翻页函数，接收页码返回 Page<T>
 * @param options - 分页控制选项（必须至少指定一个限流方式）
 * @returns 分页结果
 * @throws {CliError} 未指定任何限流方式时抛出 CLI_PAGINATION_BOUND_REQUIRED
 */
export async function paginate<T>(
  fetchPage: (page: number) => Promise<Page<T>>,
  options: PaginationOptions,
): Promise<PaginationResult<T>> {
  // 必须至少指定一种限流方式，否则可能无限循环
  if (
    options.maxPages === undefined &&
    options.maxRows === undefined &&
    options.streamed !== true
  ) {
    throw new CliError({
      code: 'CLI_PAGINATION_BOUND_REQUIRED',
      category: 'validation',
      message: 'Paginated output requires a maximum page count, maximum row count, or a stream.',
      hint: 'Set --limit/--max-pages or provide --output.',
      retryable: false,
      exitCode: 2,
    });
  }

  const items: T[] = [];
  let pageNumber = 0;
  let truncated = false;

  while (true) {
    // 检查 maxPages 限制：达到最大页数则截断退出
    if (options.maxPages !== undefined && pageNumber >= options.maxPages) {
      truncated = true;
      break;
    }

    // 获取下一页数据
    const page = await fetchPage(pageNumber);
    pageNumber += 1;

    // 计算本页最多可追加的行数
    const remaining =
      options.maxRows === undefined ? page.items.length : options.maxRows - items.length;

    // 已达到 maxRows 限制
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    // 追加数据（不超过剩余容量）
    items.push(...page.items.slice(0, remaining));

    // 当前页数据超出剩余容量，已截断
    if (page.items.length > remaining) {
      truncated = true;
      break;
    }

    // 没有更多页了
    if (!page.hasMore) break;

    // maxRows 已达上限
    if (options.maxRows !== undefined && items.length >= options.maxRows) {
      truncated = true;
      break;
    }
  }

  return { items, truncated, pages: pageNumber };
}
