/**
 * 财报数据领域类型定义。
 *
 * FinancialRecord 表示单条财务数据记录（如资产负债表、利润表、现金流量表行），
 * 通过索引签名支持动态字段扩展。
 */
export interface FinancialRecord {
  /** 同花顺股票代码 */
  thscode?: string;
  /** 财报期末日期（毫秒级 Unix 时间戳） */
  period_end_ms?: number;
  /** 其他动态字段（report_type, statement_type, 各项财务指标等） */
  [field: string]: unknown;
}
