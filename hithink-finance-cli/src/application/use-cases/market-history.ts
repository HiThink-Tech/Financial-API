/**
 * 行情历史查询用例 — 从本地 DuckDB 查询股票日线历史数据。
 *
 * ## SQL 注入防护
 * 所有用户输入通过以下方式安全拼入 SQL：
 * - thscode：对每个代码执行 `replaceAll("'", "''")` 转义单引号，然后用单引号包裹
 * - start/end 日期：格式化为 `DATE 'YYYY-MM-DD'` 字面量（由调用方保证格式合法性）
 * - 所有值通过 `queryReadOnly` 执行，该函数强制只读 SELECT
 *
 * ## 视图选择
 * 根据 adjust 参数选择对应的复权视图：
 * - 'none'     → v_daily（不复权）
 * - 'forward'  → v_daily_qfq（前复权，默认）
 * - 'backward' → v_daily_hfq（后复权）
 */
import type { DuckDBConnection } from '@duckdb/node-api';
import { queryReadOnly } from './local-query.js';

/**
 * 查询指定股票的日线行情历史。
 *
 * @param connection   - DuckDB 数据库连接
 * @param input.thscodes - 同花顺股票代码列表
 * @param input.start    - 起始日期（ISO 格式 YYYY-MM-DD）
 * @param input.end      - 结束日期（ISO 格式 YYYY-MM-DD）
 * @param input.adjust   - 复权方式：none / forward(前复权) / backward(后复权)，默认 forward
 * @returns 按 thscode, date 排序的行情数据行
 */
export async function getHistory(
  connection: DuckDBConnection,
  input: {
    thscodes: readonly string[];
    start?: string;
    end?: string;
    adjust?: 'none' | 'forward' | 'backward';
  },
): Promise<Record<string, unknown>[]> {
  // 选择复权视图
  const view =
    input.adjust === 'backward'
      ? 'v_daily_hfq' // 后复权
      : input.adjust === 'none'
        ? 'v_daily' // 不复权
        : 'v_daily_qfq'; // 前复权（默认）
  // 转义并拼接股票代码（防御 SQL 注入：对单引号做转义）
  const codes = input.thscodes.map((code) => `'${code.replaceAll("'", "''")}'`).join(',');
  // 构造 WHERE 条件
  const filters = [`thscode IN (${codes || "''"})`];
  if (input.start !== undefined) filters.push(`date >= DATE '${input.start}'`);
  if (input.end !== undefined) filters.push(`date <= DATE '${input.end}'`);
  // 通过只读查询接口执行（内部强制 SELECT 验证）
  return queryReadOnly(
    connection,
    `SELECT * FROM ${view} WHERE ${filters.join(' AND ')} ORDER BY thscode,date`,
  );
}
