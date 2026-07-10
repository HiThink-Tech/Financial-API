/**
 * 指数数据领域类型定义。
 *
 * IndexRecord 表示指数成分股或指数行情数据记录，
 * thscode 为必填字段，通过索引签名支持灵活的附加字段。
 */
export interface IndexRecord {
  /** 同花顺指数/股票代码（必填） */
  thscode: string;
  /** 指数/股票名称 */
  name?: string;
  /** 其他动态字段（weight, category, date_ms 等） */
  [field: string]: unknown;
}
