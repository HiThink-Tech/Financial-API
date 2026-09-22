# A 股

[全部业务域](../README.md)

股票价格、财务、估值、竞价与特色数据。指数走势进入指数域，基金净值进入基金域。


## 行情

查询当前价格选择行情快照，查询历史价格序列选择历史 K 线。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [行情快照](prices.md#prices-snapshot) | `GET /api/a-share/prices/snapshot` | 公开 |
| [历史 K 线](prices.md#prices-historical) | `GET /api/a-share/prices/historical` | 公开 |

## 财务报表与指标

明确报告期、报表类型与指标含义。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [财务指标数据](financials-indicators.md) | `GET /api/a-share/financials/indicators` | 公开 |
| [利润表](financials.md#financials-income-statements) | `GET /api/a-share/financials/income-statements` | 公开 |
| [资产负债表](financials.md#financials-balance-sheets) | `GET /api/a-share/financials/balance-sheets` | 公开 |
| [现金流量表](financials.md#financials-cash-flow-statements) | `GET /api/a-share/financials/cash-flow-statements` | 公开 |

## 特色数据

涨跌停与炸板、热榜、异动、龙虎榜；先确认是否支持历史。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [龙虎榜数据](special-data-dragon-tiger-list.md) | `GET /api/a-share/special-data/dragon-tiger-list` | 公开 |
| [个股异动原因列表](anomaly-analysis.md#special-data-anomaly-analysis-list) | `GET /api/a-share/special-data/anomaly-analysis-list` | 公开 |
| [按股票查询个股异动原因](anomaly-analysis.md#special-data-anomaly-analysis-stock) | `GET /api/a-share/special-data/anomaly-analysis-stock` | 公开 |
| [飙升榜](hot-list-data.md#special-data-skyrocket-list) | `GET /api/a-share/special-data/skyrocket-list` | 公开 |
| [A股热股榜单](hot-list-data.md#special-data-hot-stock-list) | `GET /api/a-share/special-data/hot-stock-list` | 公开 |
| [历史热股排行](hot-list-data.md#special-data-hot-stock-list-history) | `GET /api/a-share/special-data/hot-stock-list-history` | 公开 |
| [个股排名走势](hot-list-data.md#special-data-hot-stock-rank-trend) | `GET /api/a-share/special-data/hot-stock-rank-trend` | 公开 |
| [涨停股票池](limit-up-data.md#special-data-limit-up-pool) | `GET /api/a-share/special-data/limit-up-pool` | 公开 |
| [跌停股票池](limit-up-data.md#special-data-limit-down-pool) | `GET /api/a-share/special-data/limit-down-pool` | 公开 |
| [炸板股票池](limit-up-data.md#special-data-limit-break-pool) | `GET /api/a-share/special-data/limit-break-pool` | 公开 |
| [连板天梯](limit-up-data.md#special-data-limit-up-ladder) | `GET /api/a-share/special-data/limit-up-ladder` | 公开 |

## 集合竞价

实时或终态竞价快照、短期基准。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [A股集合竞价快照](auction.md#auction-snapshot) | `GET /api/a-share/auction/snapshot` | 公开 |
| [短线风向标竞价基准](auction.md#auction-short-term-benchmark) | `GET /api/a-share/auction/short-term-benchmark` | 公开 |

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
| [资金流向实时快照](capital-flow.md#capital-flow-snapshot) | `GET /api/a-share/capital-flow/snapshot` | 端内专用，客户端可用 |
| [资金流向历史](capital-flow.md#capital-flow-historical) | `GET /api/a-share/capital-flow/historical` | 端内专用，客户端可用 |

## 高频动向

端内高频动向、参与度、历史与单日分时。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [高频历史](high-frequency.md#high-frequency-historical) | `GET /api/a-share/high-frequency/historical` | 端内专用，客户端可用 |
| [单日高频分时](high-frequency.md#high-frequency-intraday) | `GET /api/a-share/high-frequency/intraday` | 端内专用，客户端可用 |
