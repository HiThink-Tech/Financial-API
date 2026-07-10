/**
 * 复权因子计算模块
 *
 * 根据原始除权除息事件和日K线数据，计算每只股票每日的前复权因子（forward_factor）
 * 和后复权因子（backward_factor）。
 *
 * 复权因子的计算基于"连锁乘法"原理：
 * - 后复权因子：从上市首日累积到当日，反映所有历史除权事件的复合影响
 * - 前复权因子：后复权因子除以最后一个交易日的后复权因子，使最新价格保持原始值
 *
 * 计算流程通过多个 SQL CTE（通用表表达式）分步完成：
 * 1. effective_event — 确定每个除权事件的实际生效日期
 * 2. kline_prev — 获取每个交易日的前一日收盘价
 * 3. event_ratio — 基于前收盘价计算除权日的复权比率
 * 4. day_ratio — 合并同日多个事件的比率（对数求和再指数还原）
 * 5. backward — 累积计算每个交易日的后复权因子
 * 6. normalized — 归一化得到前复权因子
 *
 * @module duckdb/factors
 */

import type { DuckDBConnection } from '@duckdb/node-api';

/**
 * 重建 calc_adjust_factor_daily 表中的复权因子数据
 *
 * 整个重建过程在一个事务中执行，先清空旧数据再重新计算。
 * 使用 LN/EXP 进行对数求和避免乘法溢出，适用于长时间序列的复权计算。
 *
 * @param connection - DuckDB 数据库连接
 * @returns 计算完成后表中的总行数
 * @throws 计算过程中任何 SQL 错误都会触发回滚
 */
export async function rebuildAdjustmentFactors(connection: DuckDBConnection): Promise<number> {
  // 使用事务确保原子性：失败时自动回滚
  await connection.run('BEGIN TRANSACTION');
  try {
    // 清空已有复权因子数据
    await connection.run('DELETE FROM calc_adjust_factor_daily');
    await connection.run(`
      INSERT INTO calc_adjust_factor_daily(thscode, date, forward_factor, backward_factor)
      WITH
      -- CTE 1: effective_event — 确定除权事件的实际生效日期
      -- 每个除权事件在 ex_date 当天或之后第一个有交易记录的日期生效
      effective_event AS (
        SELECT e.thscode, e.dividend_per_share AS d,
               e.per_share_bonus AS s,           -- 每股送转股数
               e.rights_ratio AS r,              -- 配股比例
               COALESCE(e.rights_price, 0) AS p, -- 配股价格，无配股时默认为0
               -- 查找除权日当天或之后第一个有K线数据的交易日作为生效日期
               (SELECT MIN(k.date) FROM raw_kline_daily k
                WHERE k.thscode=e.thscode AND k.date>=e.ex_date) AS eff_date
        FROM raw_adjustment_events e
      ),
      -- CTE 2: kline_prev — 获取每个交易日的前一日收盘价
      -- 使用 LAG 窗口函数取同股票的上一个交易日收盘价
      kline_prev AS (
        SELECT thscode, date,
               LAG(close) OVER(PARTITION BY thscode ORDER BY date) AS prev_close
        FROM raw_kline_daily
      ),
      -- CTE 3: event_ratio — 计算除权日对应的复权比率
      -- 公式: ratio = (prev_close * (1 + s + r)) / (prev_close - d + r * p)
      -- 其中 s=送转股数, r=配股比例, d=每股分红, p=配股价
      -- NULLIF 防止除零错误
      event_ratio AS (
        SELECT e.thscode, e.eff_date AS date,
          (k.prev_close * (1 + e.s + e.r)) /
          NULLIF(k.prev_close - e.d + e.r * e.p, 0) AS ratio
        FROM effective_event e JOIN kline_prev k
          ON k.thscode=e.thscode AND k.date=e.eff_date
        WHERE k.prev_close IS NOT NULL
      ),
      -- CTE 4: day_ratio — 合并同一天多个除权事件的比率
      -- 使用对数求和: EXP(SUM(LN(ratio))) = ratio1 * ratio2 * ...
      -- 只在 ratio > 0 时参与计算
      day_ratio AS (
        SELECT thscode, date,
               EXP(SUM(LN(ratio))) AS ratio
        FROM event_ratio WHERE ratio>0 GROUP BY thscode, date
      ),
      -- CTE 5: backward — 计算每个交易日的后复权因子
      -- 使用窗口函数按股票分区、日期排序累积乘积
      -- ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW 从上市首日累积到当日
      -- COALESCE(r.ratio, 1) 表示非除权日的比率为1（不变化）
      backward AS (
        SELECT k.thscode, k.date,
          EXP(SUM(LN(COALESCE(r.ratio,1))) OVER(
            PARTITION BY k.thscode ORDER BY k.date
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS backward_factor
        FROM raw_kline_daily k LEFT JOIN day_ratio r USING(thscode, date)
      ),
      -- CTE 6: normalized — 计算前复权因子
      -- 前复权因子 = 当日后复权因子 / 最后一个交易日的后复权因子
      -- LAST_VALUE 窗口函数获取该股票全部交易日的最后一个后复权因子
      normalized AS (
        SELECT *,
               LAST_VALUE(backward_factor) OVER(
                 PARTITION BY thscode ORDER BY date
                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_factor
        FROM backward
      )
      -- 最终输出：thscode, date, forward_factor, backward_factor
      SELECT thscode, date,
             backward_factor / NULLIF(last_factor, 0) AS forward_factor,
             backward_factor
      FROM normalized
    `);
    // 查询计算结果的记录数
    const reader = await connection.runAndReadAll('SELECT count(*) FROM calc_adjust_factor_daily');
    await connection.run('COMMIT');
    return Number(reader.getRowsJson()[0]?.[0] ?? 0);
  } catch (error) {
    // 发生错误时回滚事务，捕获回滚错误避免覆盖原始错误
    await connection.run('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
