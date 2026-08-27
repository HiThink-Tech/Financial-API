/**
 * 数据初始化用例 — 为全新的本地数据库执行首次数据灌入。
 *
 * ## 初始化流程（三步流水线）：
 * ```
 * applyMigrations()  →  importParquetBundle()  →  rebuildAdjustmentFactors()
 * (建表 + 索引)          (导入 parquet 数据)         (重建复权因子派生表)
 * ```
 *
 * 每一步都是幂等的：migrations 只执行未应用的迁移，
 * import 通过 batchId 去重，rebuild 是纯重建操作。
 */
import type { DuckDBConnection } from '@duckdb/node-api';
import { importParquetBundle, type ParquetBundle } from '../../infrastructure/duckdb/importer.js';
import { applyMigrations } from '../../infrastructure/duckdb/migrations.js';
import { rebuildAdjustmentFactors } from '../../infrastructure/duckdb/factors.js';
import { throwIfCancelled } from '../../contracts/errors.js';

/**
 * 初始化本地数据 — 从零开始构建可用的本地数据库。
 *
 * @param connection - DuckDB 数据库连接
 * @param bundle     - 包含 kline 和 events parquet 文件路径的数据包
 * @returns 重建的复权因子行数
 */
export async function initializeData(
  connection: DuckDBConnection,
  bundle: ParquetBundle,
  signal?: AbortSignal,
): Promise<number> {
  throwIfCancelled(signal);
  // 步骤 1：执行数据库迁移（建表、索引）
  await applyMigrations(connection);
  throwIfCancelled(signal);
  // 步骤 2：导入 parquet 数据文件
  await importParquetBundle(connection, bundle, signal);
  // 步骤 3：重建复权因子派生表
  const factorRows = await rebuildAdjustmentFactors(connection);
  // 数据导入提交后进入一致性临界区，必须先完成派生表再响应取消。
  throwIfCancelled(signal);
  return factorRows;
}
