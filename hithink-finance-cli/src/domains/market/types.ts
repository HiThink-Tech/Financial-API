/**
 * 行情数据领域类型定义。
 *
 * MarketBar 表示单根 K 线数据（daily bar），
 * 通过索引签名 `[field: string]: unknown` 支持灵活字段扩展。
 */
export interface MarketBar {
  /** 同花顺股票代码 */
  thscode?: string;
  /** K 线日期（毫秒级 Unix 时间戳） */
  date_ms?: number;
  /** 其他动态字段（open, high, low, close, volume, amount, preclose, pct_change 等） */
  [field: string]: unknown;
}
