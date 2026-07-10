/**
 * 特色数据领域类型定义。
 *
 * SpecialDataRecord 表示同花顺特色数据记录（如龙虎榜、涨停板、热门股票等），
 * 字段结构因数据类型而异，通过索引签名支持动态字段。
 */
export interface SpecialDataRecord {
  /** 同花顺股票代码 */
  thscode?: string;
  /** 其他动态字段（按数据类型变化：limit_status, reason, rank, turnover_rate 等） */
  [field: string]: unknown;
}
