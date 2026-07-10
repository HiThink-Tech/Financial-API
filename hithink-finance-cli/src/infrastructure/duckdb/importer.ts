/**
 * Parquet 数据导入模块
 *
 * 负责将 Parquet 格式的金融数据文件批量导入 DuckDB 数据库。
 * 支持两种数据来源格式：
 * 1. 已发布格式（published）— 使用 date_ms/ex_date_ms 时间戳字段
 * 2. 标准格式 — 使用 date/ex_date 日期字段
 *
 * 导入流程：
 * 1. 列校验 — 检查 Parquet 文件包含所有必需列
 * 2. 暂存区写入 — 将数据导入 stg_* 过渡表
 * 3. 符号维度重建 — 从 K线数据提取或从 symbols 文件导入
 * 4. 模式选择 — FULL（全量替换）或 INCREMENTAL（日期范围增量）
 * 5. 主表写入 — 从暂存区 upsert 到 main 表
 *
 * 整个导入过程在单个事务中执行，失败时自动回滚。
 *
 * @module duckdb/importer
 */

import type { DuckDBConnection } from '@duckdb/node-api';

/**
 * Parquet 数据包描述
 *
 * 一个完整的导入单元，包含K线、除权事件和可选的符号数据。
 */
export interface ParquetBundle {
  /** K线 Parquet 文件路径 */
  klinePath: string;
  /** 除权事件 Parquet 文件路径 */
  eventsPath: string;
  /** 可选的符号维度 Parquet 文件路径 */
  symbolsPath?: string;
  /** 导入批次唯一标识，用于追踪单次导入的状态 */
  batchId: string;
  /** 数据来源标识 */
  source: string;
  /** 导入模式：FULL（全量替换）/ INCREMENTAL（增量更新） */
  mode?: 'FULL' | 'INCREMENTAL';
}

/**
 * 读取 Parquet 文件的列名集合
 *
 * 使用 DuckDB 的 DESCRIBE 语句获取 Parquet 文件的元数据，
 * 返回所有列名用于后续的列校验。
 *
 * @param connection - DuckDB 数据库连接
 * @param parquetPath - Parquet 文件路径
 * @returns 列名集合
 */
async function parquetColumns(
  connection: DuckDBConnection,
  parquetPath: string,
): Promise<Set<string>> {
  const reader = await connection.runAndReadAll('DESCRIBE SELECT * FROM read_parquet($path)', {
    path: parquetPath,
  });
  // DESCRIBE 返回的每行第一列是列名
  return new Set(reader.getRowsJson().map((row) => String(row[0])));
}

/**
 * 校验 Parquet 文件是否包含所有必需列
 *
 * @param actual - Parquet 文件实际包含的列名集合
 * @param required - 必需的列名列表
 * @param kind - 数据种类标识（用于错误消息）
 * @throws 存在缺失列时抛出 Error
 */
function requireColumns(actual: Set<string>, required: string[], kind: string): void {
  const missing = required.filter((column) => !actual.has(column));
  if (missing.length > 0) throw new Error(`${kind} dump is missing columns: ${missing.join(', ')}`);
}

/**
 * 将 Parquet 数据包导入 DuckDB 数据库
 *
 * 处理流程图：
 *
 *   开始
 *    │
 *    ├─ 1. 读取 Parquet 列名，判断是 published 还是标准格式
 *    │     - published: 包含 date_ms / ex_date_ms（毫秒时间戳）
 *    │     - 标准: 包含 date / ex_date（DATE 类型）
 *    │
 *    ├─ 2. 校验必需列是否存在
 *    │
 *    ├─ 3. 在 _import_batches 表中创建导入记录
 *    │
 *    ├─ 4. 清空 stg_* 暂存表
 *    │
 *    ├─ 5. 导入 K线数据到 stg_kline_daily
 *    │     - published 格式：将 date_ms + 28800000(UTC+8偏移) 转为日期
 *    │
 *    ├─ 6. 导入除权事件到 stg_adjustment_events
 *    │
 *    ├─ 7. 处理符号维度数据
 *    │     - 有 symbolsPath：从 Parquet 文件导入
 *    │     - 无 symbolsPath：从 stg_kline_daily 中自动提取 thscode
 *    │
 *    ├─ 8. 根据模式清空/部分清空 raw_kline_daily
 *    │     - FULL：全量删除（DELETE FROM raw_kline_daily）
 *    │     - INCREMENTAL：按日期范围删除
 *    │
 *    ├─ 9. 从暂存区写入 raw_kline_daily 和 raw_adjustment_events
 *    │
 *    ├─ 10. Upsert 到 dim_symbol（冲突时保留已有名称和交易所）
 *    │
 *    ├─ 11. 更新 _import_batches 状态为 complete
 *    │
 *    └─ 提交事务
 *
 * @param connection - DuckDB 数据库连接
 * @param bundle - 要导入的 Parquet 数据包
 * @throws 任何步骤失败时回滚事务
 */
export async function importParquetBundle(
  connection: DuckDBConnection,
  bundle: ParquetBundle,
): Promise<void> {
  // 整个导入过程在事务中执行
  await connection.run('BEGIN TRANSACTION');
  try {
    // 步骤 1: 读取列名，判断数据格式
    const klineColumns = await parquetColumns(connection, bundle.klinePath);
    const eventColumns = await parquetColumns(connection, bundle.eventsPath);
    // published 格式使用毫秒时间戳（date_ms / ex_date_ms）
    const publishedKline = klineColumns.has('date_ms');
    const publishedEvents = eventColumns.has('ex_date_ms');

    // 步骤 2: 校验必需列
    requireColumns(
      klineColumns,
      publishedKline
        ? [
            'thscode',
            'date_ms',
            'open_price',
            'high_price',
            'low_price',
            'close_price',
            'volume',
            'turnover',
          ]
        : ['thscode', 'date', 'open', 'high', 'low', 'close', 'volume', 'amount'],
      'daily-k',
    );
    requireColumns(
      eventColumns,
      publishedEvents
        ? [
            'thscode',
            'ex_date_ms',
            'dividend_per_share',
            'per_share_bonus',
            'allotment_ratio',
            'allotment_price',
          ]
        : [
            'thscode',
            'ex_date',
            'dividend_per_share',
            'per_share_bonus',
            'rights_ratio',
            'rights_price',
          ],
      'adjustment-factors',
    );

    // 步骤 3: 创建导入批次记录
    await connection.run(
      "INSERT INTO _import_batches(batch_id,source,started_at,status) VALUES ($batch,$source,CURRENT_TIMESTAMP,'running')",
      { batch: bundle.batchId, source: bundle.source },
    );

    // 步骤 4: 清空暂存表
    await connection.run(
      'DELETE FROM stg_kline_daily; DELETE FROM stg_adjustment_events; DELETE FROM stg_symbol',
    );

    // 步骤 5: 导入 K线数据到暂存表
    // published 格式：epoch_ms(date_ms + 28800000) 将 UTC+8 毫秒时间戳转为日期
    // 28800000 毫秒 = 8 小时（北京时间 UTC+8 偏移）
    await connection.run(
      publishedKline
        ? `INSERT INTO stg_kline_daily SELECT thscode, CAST(epoch_ms(date_ms + 28800000) AS DATE), open_price, high_price, low_price, close_price, NULL::DOUBLE, volume, turnover, $batch FROM read_parquet($path)`
        : `INSERT INTO stg_kline_daily SELECT thscode,date,open,high,low,close,prev_close,volume,amount,$batch FROM read_parquet($path)`,
      { path: bundle.klinePath, batch: bundle.batchId },
    );

    // 步骤 6: 导入除权事件到暂存表
    await connection.run(
      publishedEvents
        ? `INSERT INTO stg_adjustment_events SELECT thscode, CAST(epoch_ms(ex_date_ms + 28800000) AS DATE), dividend_per_share, per_share_bonus, allotment_ratio, allotment_price, $batch FROM read_parquet($path)`
        : `INSERT INTO stg_adjustment_events SELECT thscode,ex_date,dividend_per_share,per_share_bonus,rights_ratio,rights_price,$batch FROM read_parquet($path)`,
      { path: bundle.eventsPath, batch: bundle.batchId },
    );

    // 步骤 7: 处理符号维度数据
    if (bundle.symbolsPath !== undefined) {
      // 从 Parquet 文件导入股票符号信息
      await connection.run('INSERT INTO stg_symbol SELECT * FROM read_parquet($path)', {
        path: bundle.symbolsPath,
      });
    } else {
      // 没有 symbols 文件时，从 stg_kline_daily 自动提取
      // split_part(thscode, '.', 1) → 股票代码（如 000001.SZ → 000001）
      // split_part(thscode, '.', 2) → 交易所后缀（如 SZ/SH）
      await connection.run(`
        INSERT INTO stg_symbol
        SELECT DISTINCT
          thscode,
          split_part(thscode, '.', 1),
          NULL::VARCHAR,
          split_part(thscode, '.', 2),
          'a-share',
          CURRENT_TIMESTAMP
        FROM stg_kline_daily
      `);
    }

    // 步骤 8: 根据导入模式清空/部分清空主表
    if ((bundle.mode ?? 'FULL') === 'FULL') {
      // FULL 模式：全量替换
      await connection.run('DELETE FROM raw_kline_daily');
    } else {
      // INCREMENTAL 模式：根据暂存区日期范围删除对应数据
      await connection.run(`
        DELETE FROM raw_kline_daily
        WHERE date BETWEEN (SELECT min(date) FROM stg_kline_daily)
                       AND (SELECT max(date) FROM stg_kline_daily)
      `);
    }

    // 步骤 9: 从暂存区写入主表
    await connection.run('INSERT OR REPLACE INTO raw_kline_daily SELECT * FROM stg_kline_daily');
    await connection.run('DELETE FROM raw_adjustment_events');
    await connection.run(
      'INSERT OR REPLACE INTO raw_adjustment_events SELECT * FROM stg_adjustment_events',
    );

    // 步骤 10: Upsert 到符号维度表
    // COALESCE 逻辑：冲突时优先保留已有值，仅当已有值为 NULL 时才用新值覆盖
    await connection.run(`
      INSERT INTO dim_symbol
      SELECT * FROM stg_symbol
      ON CONFLICT (thscode) DO UPDATE SET
        ticker=COALESCE(excluded.ticker,dim_symbol.ticker),
        name=COALESCE(excluded.name,dim_symbol.name),
        exchange=COALESCE(excluded.exchange,dim_symbol.exchange),
        asset_type=excluded.asset_type,
        updated_at=excluded.updated_at
    `);

    // 步骤 11: 更新导入批次状态
    await connection.run(
      "UPDATE _import_batches SET completed_at=CURRENT_TIMESTAMP,status='complete',row_count=(SELECT count(*) FROM stg_kline_daily) WHERE batch_id=$batch",
      { batch: bundle.batchId },
    );

    await connection.run('COMMIT');
  } catch (error) {
    // 回滚事务，忽略回滚失败
    await connection.run('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
