# A 股

[全部业务域](../README.md)

股票价格、财务、估值、竞价与特色数据。指数走势进入指数域，基金净值进入基金域。


## 行情

查询当前价格选择行情快照，查询历史价格序列选择历史 K 线。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [A股历史K线](get_a_share_prices_historical.md) | `get_a_share_prices_historical` | 公开 |
| [A股行情快照](get_a_share_prices_snapshot.md) | `get_a_share_prices_snapshot` | 公开 |

## 财务报表与指标

明确报告期、报表类型与指标含义。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [资产负债表](get_a_share_financials_balance_sheets.md) | `get_a_share_financials_balance_sheets` | 公开 |
| [现金流量表](get_a_share_financials_cash_flow_statements.md) | `get_a_share_financials_cash_flow_statements` | 公开 |
| [利润表](get_a_share_financials_income_statements.md) | `get_a_share_financials_income_statements` | 公开 |
| [财务指标数据](get_a_share_financials_indicators.md) | `get_a_share_financials_indicators` | 公开 |

## 特色数据

涨跌停与炸板、热榜、异动、龙虎榜；先确认是否支持历史。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [A股个股异动原因](get_a_share_special_data_anomaly_analysis_stock.md) | `get_a_share_special_data_anomaly_analysis_stock` | 公开 |
| [A股龙虎榜](get_a_share_special_data_dragon_tiger_list.md) | `get_a_share_special_data_dragon_tiger_list` | 公开 |
| [A股热股榜](get_a_share_special_data_hot_stock_list.md) | `get_a_share_special_data_hot_stock_list` | 公开 |
| [A股历史热股榜](get_a_share_special_data_hot_stock_list_history.md) | `get_a_share_special_data_hot_stock_list_history` | 公开 |
| [A股热股排名趋势](get_a_share_special_data_hot_stock_rank_trend.md) | `get_a_share_special_data_hot_stock_rank_trend` | 公开 |
| [A股炸板池](get_a_share_special_data_limit_break_pool.md) | `get_a_share_special_data_limit_break_pool` | 公开 |
| [A股跌停池](get_a_share_special_data_limit_down_pool.md) | `get_a_share_special_data_limit_down_pool` | 公开 |
| [A股涨停天梯](get_a_share_special_data_limit_up_ladder.md) | `get_a_share_special_data_limit_up_ladder` | 公开 |
| [A股涨停池](get_a_share_special_data_limit_up_pool.md) | `get_a_share_special_data_limit_up_pool` | 公开 |
| [A股飙升榜](get_a_share_special_data_skyrocket_list.md) | `get_a_share_special_data_skyrocket_list` | 公开 |

## 集合竞价

实时或终态竞价快照、短期基准。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [短线风向标竞价基准](get_a_share_auction_short_term_benchmark.md) | `get_a_share_auction_short_term_benchmark` | 公开 |
| [A股集合竞价快照](get_a_share_auction_snapshot.md) | `get_a_share_auction_snapshot` | 公开 |

## 交易日程

交易日、交易时段与会话时间。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [A股交易日历](get_a_share_calendar_trading_days.md) | `get_a_share_calendar_trading_days` | 公开 |

## 估值

查询估值快照，保留空值及负值。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [A股估值快照](get_a_share_valuations_snapshot.md) | `get_a_share_valuations_snapshot` | 公开 |

## 公司行动

查询 A 股复权因子和除权除息事件。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [复权因子事件流](get_a_share_corporate_actions_adjustment_factors.md) | `get_a_share_corporate_actions_adjustment_factors` | 公开 |
