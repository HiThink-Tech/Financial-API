/**
 * 行情面板查询用例 — 按日期范围获取全市场日线快照。
 *
 * 与 getHistory 不同，getPanel 不按股票代码过滤，
 * 而是返回指定时间窗口内所有股票的前复权日线数据，
 * 用于行情面板或批量分析场景。
 */
import type { DuckDBConnection } from '@duckdb/node-api';
import { queryReadOnly } from './local-query.js';

/**
 * 查询全市场前复权日线数据面板。
 *
 * @param connection - DuckDB 数据库连接
 * @param start      - 起始日期（ISO 格式 YYYY-MM-DD）
 * @param end        - 结束日期（ISO 格式 YYYY-MM-DD）
 * @returns 按 date, thscode 排序的行情数据
 */
export async function getPanel(
  connection: DuckDBConnection,
  start: string,
  end: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> {
  return queryReadOnly(
    connection,
    `SELECT * FROM v_daily_qfq WHERE date BETWEEN DATE '${start}' AND DATE '${end}' ORDER BY date,thscode`,
    signal,
  );
}
