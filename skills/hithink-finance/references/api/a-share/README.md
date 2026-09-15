# A 股

[全部业务域](../README.md)

股票价格、财务、估值、竞价与特色数据。指数走势进入指数域，基金净值进入基金域。


## 行情

查询当前价格选择行情快照，查询历史价格序列选择历史 K 线。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [行情快照](prices-snapshot.md) | `GET /api/a-share/prices/snapshot` | 公开 |
| [历史 K 线](prices-historical.md) | `GET /api/a-share/prices/historical` | 公开 |

## 财务报表与指标

明确报告期、报表类型与指标含义。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [财务指标数据](financials-indicators.md) | `GET /api/a-share/financials/indicators` | 公开 |
| [利润表](financials-income-statements.md) | `GET /api/a-share/financials/income-statements` | 公开 |
| [资产负债表](financials-balance-sheets.md) | `GET /api/a-share/financials/balance-sheets` | 公开 |
| [现金流量表](financials-cash-flow-statements.md) | `GET /api/a-share/financials/cash-flow-statements` | 公开 |

## 特色数据

涨跌停与炸板、热榜、异动、龙虎榜；先确认是否支持历史。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [龙虎榜数据](special-data-dragon-tiger-list.md) | `GET /api/a-share/special-data/dragon-tiger-list` | 公开 |
| [个股异动原因列表](special-data-anomaly-analysis-list.md) | `GET /api/a-share/special-data/anomaly-analysis-list` | 公开 |
| [按股票查询个股异动原因](special-data-anomaly-analysis-stock.md) | `GET /api/a-share/special-data/anomaly-analysis-stock` | 公开 |
| [飙升榜](special-data-skyrocket-list.md) | `GET /api/a-share/special-data/skyrocket-list` | 公开 |
| [A股热股榜单](special-data-hot-stock-list.md) | `GET /api/a-share/special-data/hot-stock-list` | 公开 |
| [历史热股排行](special-data-hot-stock-list-history.md) | `GET /api/a-share/special-data/hot-stock-list-history` | 公开 |
| [个股排名走势](special-data-hot-stock-rank-trend.md) | `GET /api/a-share/special-data/hot-stock-rank-trend` | 公开 |
| [涨停股票池](special-data-limit-up-pool.md) | `GET /api/a-share/special-data/limit-up-pool` | 公开 |
| [跌停股票池](special-data-limit-down-pool.md) | `GET /api/a-share/special-data/limit-down-pool` | 公开 |
| [炸板股票池](special-data-limit-break-pool.md) | `GET /api/a-share/special-data/limit-break-pool` | 公开 |
| [连板天梯](special-data-limit-up-ladder.md) | `GET /api/a-share/special-data/limit-up-ladder` | 公开 |

## 集合竞价

实时或终态竞价快照、短期基准。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [A股集合竞价快照](auction-snapshot.md) | `GET /api/a-share/auction/snapshot` | 公开 |
| [短线风向标竞价基准](auction-short-term-benchmark.md) | `GET /api/a-share/auction/short-term-benchmark` | 公开 |

## 交易日程

交易日、交易时段与会话时间。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [交易日历](calendar-trading-days.md) | `GET /api/a-share/calendar/trading-days` | 公开 |

## 估值

查询估值快照，保留空值及负值。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [估值数据](valuations-snapshot.md) | `GET /api/a-share/valuations/snapshot` | 公开 |

## 公司行动

查询 A 股复权因子和除权除息事件。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [除复权](corporate-actions-adjustment-factors.md) | `GET /api/a-share/corporate-actions/adjustment-factors` | 公开 |

## 资金流向

端内主力资金快照和历史。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [资金流向实时快照](capital-flow-snapshot.md) | `GET /api/a-share/capital-flow/snapshot` | 端内专用，待上线 |
| [资金流向历史](capital-flow-historical.md) | `GET /api/a-share/capital-flow/historical` | 端内专用，待上线 |

## 高频行情

端内高频历史与单日分时。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [高频历史](high-frequency-historical.md) | `GET /api/a-share/high-frequency/historical` | 端内专用，待上线 |
| [单日高频分时](high-frequency-intraday.md) | `GET /api/a-share/high-frequency/intraday` | 端内专用，待上线 |
