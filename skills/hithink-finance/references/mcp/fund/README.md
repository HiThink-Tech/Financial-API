# 公募基金

[全部业务域](../README.md)

净值与场内成交价格分别进入业绩与行情；最新披露与历史持仓分别选择对应接口。


## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金公司详情](get_fund_companies_detail.md) | `get_fund_companies_detail` | 公开 |
| [基金基本资料](get_fund_profile_detail.md) | `get_fund_profile_detail` | 公开 |

## 行情

ETF 成交价格选择快照或历史日线；基金净值进入净值与业绩分组。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [ETF 历史日线行情](get_fund_market_historical.md) | `get_fund_market_historical` | 公开 |
| [基金行情快照](get_fund_market_snapshot.md) | `get_fund_market_snapshot` | 公开 |

## 财务报表与指标

明确报告期、报表类型与指标含义。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金资产负债表](get_fund_financials_balance_sheets.md) | `get_fund_financials_balance_sheets` | 公开 |
| [基金利润表](get_fund_financials_income_statements.md) | `get_fund_financials_income_statements` | 公开 |
| [基金财务指标](get_fund_financials_indicators.md) | `get_fund_financials_indicators` | 公开 |

## 净值与业绩

净值序列、区间收益、回撤与业绩指标；交易所成交价格进入行情。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金回撤指标](get_fund_performance_drawdowns.md) | `get_fund_performance_drawdowns` | 公开 |
| [基金历史业绩指标](get_fund_performance_indicators_historical.md) | `get_fund_performance_indicators_historical` | 公开 |
| [基金净值](get_fund_performance_nav.md) | `get_fund_performance_nav` | 公开 |
| [基金区间收益](get_fund_performance_returns.md) | `get_fund_performance_returns` | 公开 |

## 持仓与配置

最新披露重仓股与报告期持仓不同；历史查询先取得股票或债券报告日期。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金资产配置](get_fund_portfolio_asset_allocation.md) | `get_fund_portfolio_asset_allocation` | 公开 |
| [基金历史债券持仓](get_fund_portfolio_bond_history.md) | `get_fund_portfolio_bond_history` | 公开 |
| [基金债券持仓报告日期](get_fund_portfolio_bond_report_dates.md) | `get_fund_portfolio_bond_report_dates` | 公开 |
| [基金重仓股](get_fund_portfolio_holdings.md) | `get_fund_portfolio_holdings` | 公开 |
| [基金行业配置](get_fund_portfolio_industry_allocation.md) | `get_fund_portfolio_industry_allocation` | 公开 |
| [基金历史股票持仓](get_fund_portfolio_stock_history.md) | `get_fund_portfolio_stock_history` | 公开 |
| [基金股票持仓报告日期](get_fund_portfolio_stock_report_dates.md) | `get_fund_portfolio_stock_report_dates` | 公开 |

## 持有人

持有人结构、合并份额口径与前十大持有人。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金持有人结构](get_fund_holders_detail.md) | `get_fund_holders_detail` | 公开 |
| [基金前十大持有人](get_fund_holders_top.md) | `get_fund_holders_top` | 公开 |

## 基金经理

经理详情、任职经历、业绩与风格；经理 ID 从基金资料取得。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金经理详情](get_fund_managers_detail.md) | `get_fund_managers_detail` | 公开 |
| [基金经理从业经历](get_fund_managers_experience.md) | `get_fund_managers_experience` | 公开 |
| [基金经理投资风格](get_fund_managers_investment_style.md) | `get_fund_managers_investment_style` | 公开 |
| [基金经理业绩](get_fund_managers_performance.md) | `get_fund_managers_performance` | 公开 |

## 在线回测

先查询可用指标，再构造回测条件。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金回测指标](get_fund_backtest_indicators.md) | `get_fund_backtest_indicators` | 公开 |
| [基金在线回测](get_fund_backtest_result.md) | `get_fund_backtest_result` | 公开 |

## 通用指标

选择画线序列或表格，确认指标与选择器。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金画线指标](get_fund_indicators_line.md) | `get_fund_indicators_line` | 公开 |
| [基金表格指标](get_fund_indicators_table.md) | `get_fund_indicators_table` | 公开 |

## QDII 额度

分类额度汇总与基金明细列表。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [QDII额度列表](get_fund_quota_list.md) | `get_fund_quota_list` | 公开 |
| [QDII额度汇总](get_fund_quota_summary.md) | `get_fund_quota_summary` | 公开 |

## 资讯与募集

基金资讯和在售、待售基金。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金资讯列表](get_fund_news_article_list.md) | `get_fund_news_article_list` | 公开 |
| [基金募集列表](get_fund_offerings_list.md) | `get_fund_offerings_list` | 公开 |

## 诊断

基金诊断数据。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金诊断详情](get_fund_diagnostics_detail.md) | `get_fund_diagnostics_detail` | 公开 |

## 公司行动

查询基金分红记录。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [基金分红记录](get_fund_corporate_actions_dividends.md) | `get_fund_corporate_actions_dividends` | 公开 |
