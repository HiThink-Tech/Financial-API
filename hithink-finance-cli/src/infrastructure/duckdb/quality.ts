/**
 * 数据质量校验模块
 *
 * 对 DuckDB 数据库中的数据执行多项质量检查，覆盖完整性、一致性和合理性。
 * 检查项包括：
 * - 重复主键检测
 * - OHLC 数据合理性（高>=最高，低<=最低）
 * - 负值检测（成交量/成交额）
 * - 复权因子完整性
 * - 物化视图行数一致性
 * - 股票代码覆盖度
 * - 导入批次完整性
 * - 日期范围合理性
 *
 * 所有检查统一返回 QualityResult，包含 OK 标志和问题列表。
 *
 * @module duckdb/quality
 */

import type { DuckDBConnection } from '@duckdb/node-api';

/**
 * 单个质量问题描述
 */
export interface QualityIssue {
  /** 质量问题代码（如 QUALITY_DUPLICATE_KEY） */
  code: string;
  /** 受影响的记录数 */
  count: number;
  /** 问题的中文描述 */
  message: string;
}

/**
 * 质量校验结果
 */
export interface QualityResult {
  /** 所有检查是否通过（无任何 issue） */
  ok: boolean;
  /** 检测到的问题列表 */
  issues: QualityIssue[];
}

/**
 * 执行 SQL 查询并返回计数结果
 *
 * 假设 SQL 查询返回单行单列的计数值。
 *
 * @param connection - DuckDB 数据库连接
 * @param sql - 返回计数结果的 SQL 查询
 * @returns 计数值，查询失败或结果为空时返回 0
 */
async function count(connection: DuckDBConnection, sql: string): Promise<number> {
  const reader = await connection.runAndReadAll(sql);
  return Number(reader.getRowsJson()[0]?.[0] ?? 0);
}

/**
 * 对数据库执行全面的质量检查
 *
 * 检查项包括：
 * 1. QUALITY_DUPLICATE_KEY — 日K线表存在重复的 (thscode, date) 主键
 * 2. QUALITY_INVALID_OHLC — OHLC 关系不合理（最高价低于开盘/收盘/最低价，或最低价高于开盘/收盘/最高价）
 * 3. QUALITY_NEGATIVE_VOLUME — 成交量或成交额为负值
 * 4. QUALITY_FACTOR_GAP — 日K线存在但没有对应复权因子
 * 5. QUALITY_VIEW_MISMATCH — raw_kline_daily 和 v_daily 视图行数不一致
 * 6. QUALITY_SYMBOL_COVERAGE — 日K线中的 thscode 在 dim_symbol 表中缺失
 * 7. QUALITY_INCOMPLETE_BATCH — 存在未完成的导入批次
 * 8. QUALITY_INVALID_DATE — 日期超出合理范围（1990年之前或超过当前日期）
 *
 * @param connection - DuckDB 数据库连接
 * @returns 质量校验结果
 */
export async function validateDatabase(connection: DuckDBConnection): Promise<QualityResult> {
  // 定义所有检查项：[错误码, 错误描述, 检测 SQL]
  const checks = [
    [
      'QUALITY_DUPLICATE_KEY',
      'duplicate daily keys',
      `SELECT count(*) FROM (SELECT thscode,date FROM raw_kline_daily GROUP BY thscode,date HAVING count(*)>1)`,
    ],
    [
      'QUALITY_INVALID_OHLC',
      'invalid OHLC relationships',
      // 最高价应 >= 开盘价、收盘价、最低价中的最大值
      // 最低价应 <= 开盘价、收盘价、最高价中的最小值
      `SELECT count(*) FROM raw_kline_daily WHERE high<GREATEST(open,close,low) OR low>LEAST(open,close,high)`,
    ],
    [
      'QUALITY_NEGATIVE_VOLUME',
      'negative volume or amount',
      `SELECT count(*) FROM raw_kline_daily WHERE volume<0 OR amount<0`,
    ],
    [
      'QUALITY_FACTOR_GAP',
      'missing adjustment factors',
      // LEFT JOIN 检查日K线中有但复权因子表中缺失的记录
      `SELECT count(*) FROM raw_kline_daily k LEFT JOIN calc_adjust_factor_daily f USING(thscode,date) WHERE f.date IS NULL`,
    ],
    [
      'QUALITY_VIEW_MISMATCH',
      'stable view row mismatch',
      // 比较原始表和物化视图的行数差异
      `SELECT abs((SELECT count(*) FROM raw_kline_daily)-(SELECT count(*) FROM v_daily))`,
    ],
    [
      'QUALITY_SYMBOL_COVERAGE',
      'daily rows without symbols',
      `SELECT count(*) FROM raw_kline_daily k LEFT JOIN dim_symbol s USING(thscode) WHERE s.thscode IS NULL`,
    ],
    [
      'QUALITY_INCOMPLETE_BATCH',
      'incomplete import batches',
      `SELECT count(*) FROM _import_batches WHERE status<>'complete'`,
    ],
    [
      'QUALITY_INVALID_DATE',
      'dates outside supported range',
      // 日期范围：1990-01-01（A股历史数据起点）至当前日期
      `SELECT count(*) FROM raw_kline_daily WHERE date<DATE '1990-01-01' OR date>CURRENT_DATE`,
    ],
  ] as const;
  const issues: QualityIssue[] = [];
  // 逐项检查，只收集有问题的检查结果
  for (const [code, message, sql] of checks) {
    const issueCount = await count(connection, sql);
    if (issueCount > 0) issues.push({ code, count: issueCount, message });
  }
  return { ok: issues.length === 0, issues };
}
