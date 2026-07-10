/**
 * 数据同步用例 — 从 Fuyao 远程仓库拉取并合并数据。
 *
 * ## 同步决策矩阵（chooseSyncDecision）：
 *
 * ```
 * 条件                                    决策
 * ─────────────────────────────────────────────────
 * 本地无数据（maxDate === null）            FULL     全量下载
 * 本地已是最新（日期 >= 远端 且 ID 相同）    SKIP      无需同步
 * 滞后交易日 ≤ maxIncrementalLag             INCREMENTAL 增量更新
 * 滞后交易日 > maxIncrementalLag             FULL     全量覆盖
 * ```
 *
 * ## syncDataFromFuyao 流程：
 * 1. applyMigrations — 确保 schema 最新
 * 2. 查询本地 max(date) 和上次 releaseId
 * 3. 判断 dump kind（全量 daily-k / 增量 daily-k-10d）
 * 4. 拉取 kline + adjustment-factors 数据包
 * 5. 如 releaseId 未变 → SKIP 跳过
 * 6. 执行 import → 重建复权因子 → 校验 → 记录 _meta
 */
export type SyncDecision = 'SKIP' | 'INCREMENTAL' | 'FULL';

/** 本地同步状态快照 */
export interface LocalSyncState {
  /** 本地最新数据的日期（ISO 日期字符串），null 表示无数据 */
  maxDate: string | null;
  /** 上次同步的 release 版本标识 */
  releaseId: string | null;
}

/** 远程 release 状态 */
export interface RemoteReleaseState {
  /** 远端最新数据日期 */
  latestDate: string;
  /** 远端 release 版本标识 */
  releaseId: string;
  /** 滞后交易日数（用于增量/全量决策） */
  lagTradingDays: number;
}

/**
 * 根据本地和远端状态决定同步策略。
 *
 * @param local             - 本地数据状态
 * @param remote            - 远端 release 状态
 * @param maxIncrementalLag - 增量更新的最大滞后交易日数，默认 5
 * @returns 同步决策：SKIP / INCREMENTAL / FULL
 */
export function chooseSyncDecision(
  local: LocalSyncState,
  remote: RemoteReleaseState,
  maxIncrementalLag = 5,
): SyncDecision {
  // 本地没有数据 → 必须全量下载
  if (local.maxDate === null) return 'FULL';
  // 本地数据版本 >= 远端版本，且 releaseId 匹配 → 无需同步
  if (local.maxDate >= remote.latestDate && local.releaseId === remote.releaseId) return 'SKIP';
  // 滞后交易日数在阈值内 → 增量更新；超出阈值 → 全量覆盖
  return remote.lagTradingDays <= maxIncrementalLag ? 'INCREMENTAL' : 'FULL';
}

import type { DuckDBConnection } from '@duckdb/node-api';
import { fetchFuyaoDump, type DumpKind } from '../../infrastructure/duckdb/dump-client.js';
import { importParquetBundle } from '../../infrastructure/duckdb/importer.js';
import { applyMigrations } from '../../infrastructure/duckdb/migrations.js';
import { rebuildAdjustmentFactors } from '../../infrastructure/duckdb/factors.js';
import { validateDatabase } from '../../infrastructure/duckdb/quality.js';

/** Fuyao 同步操作的配置选项 */
export interface FuyaoSyncOptions {
  /** Fuyao dump API 的 base URL */
  baseUrl: string;
  /** 认证 API Key */
  apiKey: string;
  /** 下载缓存目录 */
  cacheDir: string;
  /** 当前时间（可注入，用于测试） */
  now?: Date;
}

/**
 * 执行单次 SQL 标量查询，返回第一个单元格的字符串值。
 * 用于读取 _meta 表中的版本信息。
 *
 * @param connection - DuckDB 连接
 * @param sql        - 标量查询 SQL
 * @returns 结果字符串或 null
 */
async function scalar(connection: DuckDBConnection, sql: string): Promise<string | null> {
  const reader = await connection.runAndReadAll(sql);
  const value = reader.getRowsJson()[0]?.[0];
  return value === null || value === undefined ? null : String(value);
}

/**
 * 从 Fuyao 同步数据到本地 DuckDB 数据库。
 *
 * ## 详细流程：
 * 1. 应用数据库迁移
 * 2. 读取本地 max(date) 和上次 releaseId
 * 3. 计算滞后天数并决定 dump kind：
 *    - 无数据或滞后 > 14 天 → daily-k（全量）
 *    - 滞后 ≤ 14 天 → daily-k-10d（增量 10 天）
 * 4. 拉取 kline dump，检查 releaseId：
 *    - 与上次相同 → 跳过，返回 SKIP
 * 5. 拉取 adjustment-factors dump
 * 6. 导入数据 → 重建复权因子
 * 7. 写入 _meta 记录（last_kline_release_id, last_sync_mode 等）
 * 8. 执行数据库质量校验
 *
 * @param connection - DuckDB 数据库连接
 * @param options    - Fuyao 同步配置
 * @returns 同步结果（决策、releaseId、复权行数、质量报告）
 */
export async function syncDataFromFuyao(
  connection: DuckDBConnection,
  options: FuyaoSyncOptions,
): Promise<{ decision: SyncDecision; releaseId: string; factorRows: number; quality: unknown }> {
  // 步骤 1：确保数据库 schema 是最新版本
  await applyMigrations(connection);
  // 步骤 2：查询本地最新数据日期
  const maxDate = await scalar(connection, 'SELECT max(date)::VARCHAR FROM raw_kline_daily');
  // 查询上次同步的 kline release id
  const previousRelease = await scalar(
    connection,
    "SELECT value FROM _meta WHERE key='last_kline_release_id'",
  );
  // 计算滞后天数
  const now = options.now ?? new Date();
  const lagDays =
    maxDate === null
      ? Number.POSITIVE_INFINITY // 无数据视为无限滞后
      : Math.floor((now.getTime() - Date.parse(`${maxDate}T00:00:00Z`)) / 86_400_000);
  // 步骤 3：选择 dump 类型：无数据或滞后 > 14 天 → 全量，否则 → 增量 10 天
  const kind: DumpKind = maxDate === null || lagDays > 14 ? 'daily-k' : 'daily-k-10d';
  // 步骤 4：拉取 kline 数据包
  const kline = await fetchFuyaoDump({ ...options, kind });
  // releaseId 未变更 → 跳过同步
  if (previousRelease === kline.releaseId) {
    return {
      decision: 'SKIP',
      releaseId: kline.releaseId,
      factorRows: 0,
      quality: await validateDatabase(connection),
    };
  }
  // 步骤 5：拉取复权因子数据包
  const events = await fetchFuyaoDump({ ...options, kind: 'adjustment-factors' });
  // 步骤 6：确定同步模式并构造 batchId（时间戳，用于去重和追踪）
  const decision: SyncDecision = kind === 'daily-k' ? 'FULL' : 'INCREMENTAL';
  const batchId = `${decision.toLowerCase()}-${Date.now()}`;
  // 执行数据导入（包含去重、合并逻辑）
  await importParquetBundle(connection, {
    klinePath: kline.path,
    eventsPath: events.path,
    batchId,
    source: `fuyao:${kline.releaseId}`,
    mode: decision,
  });
  // 步骤 7：重建复权因子派生表
  const factorRows = await rebuildAdjustmentFactors(connection);
  // 记录此次同步的元数据
  await connection.run(
    "INSERT OR REPLACE INTO _meta VALUES ('last_kline_release_id',$kline),('last_adjustment_release_id',$events),('last_sync_mode',$mode)",
    { kline: kline.releaseId, events: events.releaseId, mode: decision },
  );
  // 步骤 8：返回结果（含质量校验报告）
  return {
    decision,
    releaseId: kline.releaseId,
    factorRows,
    quality: await validateDatabase(connection),
  };
}
