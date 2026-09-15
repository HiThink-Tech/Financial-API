# 公募基金

[全部业务域](../README.md)

净值与场内成交价格分别进入业绩与行情；最新披露与历史持仓分别选择对应接口。


## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金公司详情](companies-detail.md) | `GET /api/fund/companies/detail` | 公开 |
| [基金基本资料](profile-detail.md) | `GET /api/fund/profile/detail` | 公开 |

## 行情

ETF 成交价格选择快照或历史日线；基金净值进入净值与业绩分组。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [场内基金行情快照](market-snapshot.md) | `GET /api/fund/market/snapshot` | 公开 |
| [场内基金历史日线行情](market-historical.md) | `GET /api/fund/market/historical` | 公开 |

## 财务报表与指标

明确报告期、报表类型与指标含义。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金财务指标](financials-indicators.md) | `GET /api/fund/financials/indicators` | 公开 |
| [基金利润表](financials-income-statements.md) | `GET /api/fund/financials/income-statements` | 公开 |
| [基金资产负债表](financials-balance-sheets.md) | `GET /api/fund/financials/balance-sheets` | 公开 |

## 净值与业绩

净值序列、区间收益、回撤与业绩指标；交易所成交价格进入行情。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金净值](performance-nav.md) | `GET /api/fund/performance/nav` | 公开 |
| [基金区间收益](performance-returns.md) | `GET /api/fund/performance/returns` | 公开 |
| [基金历史业绩指标](performance-indicators-historical.md) | `GET /api/fund/performance/indicators-historical` | 公开 |
| [基金最大回撤](performance-drawdowns.md) | `GET /api/fund/performance/drawdowns` | 公开 |

## 持仓与配置

最新披露重仓股与报告期持仓不同；历史查询先取得股票或债券报告日期。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金重仓持仓](portfolio-holdings.md) | `GET /api/fund/portfolio/holdings` | 公开 |
| [基金历史股票持仓](portfolio-stock-history.md) | `GET /api/fund/portfolio/stock-history` | 公开 |
| [基金历史债券持仓](portfolio-bond-history.md) | `GET /api/fund/portfolio/bond-history` | 公开 |
| [基金股票持仓报告日期](portfolio-stock-report-dates.md) | `GET /api/fund/portfolio/stock-report-dates` | 公开 |
| [基金债券持仓报告日期](portfolio-bond-report-dates.md) | `GET /api/fund/portfolio/bond-report-dates` | 公开 |
| [基金资产配置](portfolio-asset-allocation.md) | `GET /api/fund/portfolio/asset-allocation` | 公开 |
| [基金行业配置](portfolio-industry-allocation.md) | `GET /api/fund/portfolio/industry-allocation` | 公开 |

## 持有人

持有人结构、合并份额口径与前十大持有人。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金持有人结构](holders-detail.md) | `GET /api/fund/holders/detail` | 公开 |
| [基金前十大持有人](holders-top.md) | `GET /api/fund/holders/top` | 公开 |

## 基金经理

经理详情、任职经历、业绩与风格；经理 ID 从基金资料取得。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [投资风格](managers-investment-style.md) | `GET /api/fund/managers/investment-style` | 公开 |
| [基金经理业绩](managers-performance.md) | `GET /api/fund/managers/performance` | 公开 |
| [从业经历](managers-experience.md) | `GET /api/fund/managers/experience` | 公开 |
| [基金经理详情](managers-detail.md) | `GET /api/fund/managers/detail` | 公开 |

## 在线回测

先查询可用指标，再构造回测条件。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金在线回测](backtest-result.md) | `GET /api/fund/backtest/result` | 公开 |
| [基金回测可用指标](backtest-indicators.md) | `GET /api/fund/backtest/indicators` | 公开 |

## 通用指标

选择画线序列或表格，确认指标与选择器。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金画线指标](indicators-line.md) | `GET /api/fund/indicators/line` | 公开 |
| [基金表格指标](indicators-table.md) | `GET /api/fund/indicators/table` | 公开 |

## QDII 额度

分类额度汇总与基金明细列表。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [QDII额度汇总](quota-summary.md) | `GET /api/fund/quota/summary` | 公开 |
| [QDII额度列表](quota-list.md) | `GET /api/fund/quota/list` | 公开 |

## 资讯与募集

基金资讯和在售、待售基金。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金资讯列表](news-article-list.md) | `GET /api/fund/news/article-list` | 公开 |
| [基金募集列表](offerings-list.md) | `GET /api/fund/offerings/list` | 公开 |

## 诊断

基金诊断数据。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金诊断详情](diagnostics-detail.md) | `GET /api/fund/diagnostics/detail` | 公开 |

## 公司行动

查询基金分红记录。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金分红记录](corporate-actions-dividends.md) | `GET /api/fund/corporate-actions/dividends` | 公开 |
