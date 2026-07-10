/**
 * 数据修复用例 — 重建复权因子派生表。
 *
 * 这是一个薄封装，将 infrastructure 层的
 * `rebuildAdjustmentFactors` 暴露为应用层用例。
 * 适用于数据库质量校验发现问题后触发修复。
 */
import type { DuckDBConnection } from '@duckdb/node-api';
import { rebuildAdjustmentFactors } from '../../infrastructure/duckdb/factors.js';

/**
 * 修复本地数据 — 重建复权因子表并返回受影响行数。
 *
 * @param connection - DuckDB 数据库连接
 * @returns 包含重建行数的结果对象
 */
export async function repairData(connection: DuckDBConnection): Promise<{ factorRows: number }> {
  return { factorRows: await rebuildAdjustmentFactors(connection) };
}
