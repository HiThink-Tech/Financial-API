/**
 * 证券代码领域类型定义。
 *
 * SymbolRecord 表示股票/证券的代码映射信息，
 * 包含同花顺内部代码（thscode）、交易所 ticker 和中文名称。
 */
export interface SymbolRecord {
  /** 同花顺内部证券代码（必填，主键） */
  thscode: string;
  /** 交易所行情代码（如 "600000"） */
  ticker?: string;
  /** 证券中文名称（如 "浦发银行"） */
  name?: string;
}
