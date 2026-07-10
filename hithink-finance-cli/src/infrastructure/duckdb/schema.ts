/**
 * 数据库 Schema 常量定义模块
 *
 * 定义 DuckDB 数据库的核心表、物化视图和当前支持的 schema 版本。
 * 这些常量供 migrations、quality 等模块引用，确保各模块对数据库结构的认知一致。
 *
 * 表职责说明：
 * - _meta：元数据键值对存储（schema 版本、校验和等）
 * - _import_batches：数据导入批次追踪
 * - raw_kline_daily：原始日K线数据
 * - raw_adjustment_events：原始除权除息事件
 * - dim_symbol：股票维度表（代码、名称、交易所等）
 * - calc_adjust_factor_daily：计算的每日复权因子
 * - stg_*：数据导入临时/过渡表
 *
 * @module duckdb/schema
 */

/** 数据库核心表列表（物理表） */
export const CORE_TABLES = [
  '_meta',
  '_import_batches',
  'raw_kline_daily',
  'raw_adjustment_events',
  'dim_symbol',
  'calc_adjust_factor_daily',
  'stg_kline_daily',
  'stg_adjustment_events',
  'stg_symbol',
] as const;

/** 数据库物化视图列表 */
export const STABLE_VIEWS = ['v_symbol', 'v_daily', 'v_daily_qfq', 'v_daily_hfq'] as const;

/** 当前 CLI 版本支持的数据库 schema 版本号 */
export const SUPPORTED_SCHEMA_VERSION = 1;
