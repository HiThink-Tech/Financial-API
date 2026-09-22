# 公募基金 MCP 工具

净值与场内成交价格分别进入业绩与行情；最新披露与历史持仓分别选择对应接口。

## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

### 基金公司详情（`get_fund_companies_detail`）

**描述**

按基金公司 ID 查询公司详情。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `company_id` | string | 是 | — | 基金公司 ID。 |

**响应**

返回 `{ timestamp, item[] }`；字段见 [基金公司详情](../api/fund/companies-detail.md)。

### 基金基本资料（`get_fund_profile_detail`）

**描述**

查询单只基金的基础资料，返回代码、名称、成立日期、公司、基金经理、规模、单位净值、交易规则与费率。
基金工具使用完整 `thscode` 唯一定位基金。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀，如 `025480.OF` / `510300.SH`。 |

**响应**

返回 `{ timestamp, item: [FundProfileItem, ...] }`。字段含义见 [基金基本资料](../api/fund/profile-detail.md#返回字段)。

## 行情

ETF 成交价格选择快照或历史日线；基金净值进入净值与业绩分组。

### ETF 历史日线行情（`get_fund_market_historical`）

**描述**

查询单只 ETF 的前复权历史日线行情。仅支持 `interval=1d`，查询窗口最长 5 个自然年。
LOF、场外基金和 REITs 返回 `code=3004`。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 ETF thscode，如 `510300.SH`。不接受逗号多值。 |
| `interval` | enum | 否 | `1d` | K 线周期，当前仅支持 `1d`。 |
| `start` | long | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒 Unix 时间戳；必须不早于 `start`，窗口最长 5 个自然年。 |

**响应**

返回 `{ timestamp, thscode, interval, adjust, item: [PriceBarItem, ...] }`，其中
价格字段采用前复权口径；`adjust` 固定为 `null`。字段含义见 [场内基金历史日线行情](../api/fund/fund-market.md#market-historical--场内基金历史日线行情)。

### 基金行情快照（`get_fund_market_snapshot`）

**描述**

查询 ETF 和 LOF 的行情快照。工具使用完整 `thscode` 唯一定位基金。
场外基金和 REITs 返回 `code=3004`；支持的标的尚无可用快照时返回 `code=3002`。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | `510300.SH` | 单只 ETF 或 LOF 的完整 thscode，必须保留市场后缀，如 `.SH` 或 `.SZ`；不接受逗号分隔的多个值。 |

系统会根据 `thscode` 识别标的类型。

**响应**

返回 `{ timestamp, item: [FundMarketSnapshotItem, ...] }`。字段含义见 [场内基金行情快照](../api/fund/fund-market.md#market-snapshot--场内基金行情快照)。

## 财务报表与指标

明确报告期、报表类型与指标含义。

### 基金资产负债表（`get_fund_financials_balance_sheets`）

**描述**

查询基金资产、负债与所有者权益。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

**响应**

返回报告期、资产、负债与所有者权益字段；字段见 [基金资产负债表](../api/fund/fund-financials.md#financials-balance-sheets--基金资产负债表)。

### 基金利润表（`get_fund_financials_income_statements`）

**描述**

查询基金经营业绩及收益分配。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

**响应**

返回报告期、收入、费用与利润字段；字段见 [基金利润表](../api/fund/fund-financials.md#financials-income-statements--基金利润表)。

### 基金财务指标（`get_fund_financials_indicators`）

**描述**

查询基金主要财务指标。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

**响应**

返回报告期及基金主要财务指标；字段见 [基金财务指标](../api/fund/fund-financials.md#financials-indicators--基金财务指标)。

## 净值与业绩

净值序列、区间收益、回撤与业绩指标；交易所成交价格进入行情。

### 基金回撤指标（`get_fund_performance_drawdowns`）

**描述**

查询基金十个区间的最大回撤。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

**响应**

返回基金代码与十个区间最大回撤；字段见 [基金最大回撤](../api/fund/fund-performance.md#performance-drawdowns--基金最大回撤)。

### 基金历史业绩指标（`get_fund_performance_indicators_historical`）

**描述**

查询基金净值波动、趋势强弱与估值百分位序列。指标周期固定为 `DAY_1`，响应 `data` 仅包含 `timestamp` 和 `item`，不返回顶层 `thscode` 或 `interval`。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `start` | integer | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | integer | 是 | — | 结束时间，毫秒 Unix 时间戳。 |

`start` 和 `end` 必须同时提供；遗漏任一参数都会导致请求参数校验失败。

**响应**

返回 `{ timestamp, item[] }`，`timestamp` 保留明确的上游数据时间；固定周期 `DAY_1` 不作为顶层字段返回，也不返回顶层 `thscode` 或 `interval`。字段见 [基金历史业绩指标](../api/fund/fund-performance.md#performance-indicators-historical--基金历史业绩指标)。

### 基金净值（`get_fund_performance_nav`）

**描述**

查询基金单位净值和复权净值。不传 `range` 时只返回最新一个净值日期；传入 `range`
时返回区间序列。`nav_type` 控制返回单位净值、复权净值或二者。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |
| `range` | enum | 否 | 最新一条 | `week` / `month` / `tmonth` / `hyear` / `year` / `twoyear` / `tyear` / `fyear`。 |
| `nav_type` | enum | 否 | `unit,adj` | `unit`（单位净值）/ `adj`（复权净值）/ `unit,adj`。 |

**响应**

返回 `{ timestamp, item: [FundNavItem, ...] }`。字段含义见 [基金净值](../api/fund/fund-performance.md#performance-nav--基金净值)。

### 基金区间收益（`get_fund_performance_returns`）

**描述**

查询基金多区间收益率，并返回对应区间的同类平均、同类排名与参与排名总数。
收益率为百分数原值，如 `8.88` 表示 `8.88%`。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

**响应**

返回 `{ timestamp, item: [FundReturnsItem, ...] }`。字段含义见 [基金区间收益](../api/fund/fund-performance.md#performance-returns--基金区间收益)。

## 持仓与配置

最新披露重仓股与报告期持仓不同；历史查询先取得股票或债券报告日期。

### 基金资产配置（`get_fund_portfolio_asset_allocation`）

**描述**

查询基金股票、债券、存款与其他资产配置比例。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

**响应**

返回报告日期与各资产配置比例；字段见 [基金资产配置](../api/fund/fund-portfolio.md#portfolio-asset-allocation--基金资产配置)。

### 基金历史债券持仓（`get_fund_portfolio_bond_history`）

**描述**

查询基金指定报告期的历史债券持仓。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 是 | — | 报告类型。 |
| `end_date` | string | 是 | — | 报告截止日期。 |

**响应**

返回历史债券持仓明细；`rank` 仅前十大持仓为 `1`–`10`，其余持仓为 `null`。字段见 [基金历史债券持仓](../api/fund/fund-portfolio.md#portfolio-bond-history--基金历史债券持仓)。

### 基金债券持仓报告日期（`get_fund_portfolio_bond_report_dates`）

**描述**

查询基金债券持仓可用报告期。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 否 | — | 可选报告类型。 |

**响应**

返回报告类型、名称与起止日期；字段见 [基金债券持仓报告日期](../api/fund/fund-portfolio.md#portfolio-bond-report-dates--基金债券持仓报告日期)。

### 基金重仓股（`get_fund_portfolio_holdings`）

**描述**

查询单只基金定期披露的股票、债券和基金持仓，并返回持仓占比、排名与汇总指标。
持仓来自定期披露，不代表实时持仓。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | `025480.OF` | 完整基金 thscode，必须保留市场后缀，如 `025480.OF` / `510300.SH` / `161725.SZ`。 |

**响应**

返回 `{ timestamp, item: [FundHoldingItem, ...] }`。字段含义见 [基金重仓股](../api/fund/portfolio-holdings.md#返回字段)。

### 基金行业配置（`get_fund_portfolio_industry_allocation`）

**描述**

查询单只基金的申万行业配置。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

**响应**

返回报告期、行业名称与配置比例；字段见 [基金行业配置](../api/fund/fund-portfolio.md#portfolio-industry-allocation--基金行业配置)。

### 基金历史股票持仓（`get_fund_portfolio_stock_history`）

**描述**

查询基金指定报告期的历史股票持仓。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 是 | — | 报告类型。 |
| `end_date` | string | 是 | — | 报告截止日期。 |

**响应**

返回历史股票持仓明细；`rank` 仅前十大持仓为 `1`–`10`，其余持仓为 `null`。字段见 [基金历史股票持仓](../api/fund/fund-portfolio.md#portfolio-stock-history--基金历史股票持仓)。

### 基金股票持仓报告日期（`get_fund_portfolio_stock_report_dates`）

**描述**

查询基金股票持仓可用报告期。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 否 | — | 可选报告类型。 |

**响应**

返回报告类型、名称与起止日期；字段见 [基金股票持仓报告日期](../api/fund/fund-portfolio.md#portfolio-stock-report-dates--基金股票持仓报告日期)。

## 持有人

持有人结构、合并份额口径与前十大持有人。

### 基金持有人结构（`get_fund_holders_detail`）

**描述**

查询基金持有人结构，支持合并份额、独立份额或全部披露口径，返回实际口径、报告日、机构占比、持有人户数、户均持有份额、个人投资者占比和管理人员工持有比例。暂无可用数据时返回 `code=3002`。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |
| `merge_scope` | enum | 否 | `all` | `all` / `merged` / `separate`；`all` 分别返回合并与独立份额的最新记录。 |

**响应**

返回 `{ timestamp, item: [FundHoldersItem, ...] }`。`all` 时 `item` 最多包含 `merged` 和 `separate` 两条最新记录；单一口径最多一条。字段含义见 [基金持有人结构](../api/fund/fund-holders.md#holders-detail--返回字段)。

### 基金前十大持有人（`get_fund_holders_top`）

**描述**

查询基金前十大持有人及持有份额。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `limit` | integer | 否 | — | 返回条数，最大 10。 |

**响应**

返回持有人、排名、份额、比例与报告日期；字段见 [基金前十大持有人](../api/fund/fund-holders.md#holders-top--基金前十大持有人)。

## 基金经理

经理详情、任职经历、业绩与风格；经理 ID 从基金资料取得。

### 基金经理详情（`get_fund_managers_detail`）

**描述**

查询基金经理基本信息与雷达对比。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

**响应**

返回经理资料、公司、收益与雷达对比；字段见 [基金经理详情](../api/fund/fund-managers.md#managers-detail--基金经理详情)。

### 基金经理从业经历（`get_fund_managers_experience`）

**描述**

查询基金经理荣誉、重仓资产与投资经历。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

**响应**

返回荣誉、重仓资产与投资经历三组结构化数据；字段见 [从业经历](../api/fund/fund-managers.md#managers-experience--从业经历)。

### 基金经理投资风格（`get_fund_managers_investment_style`）

**描述**

查询基金经理代表基金、投资理念与行业偏好。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

**响应**

返回代表基金、投资理念、管理规模与行业偏好；字段见 [投资风格](../api/fund/fund-managers.md#managers-investment-style--投资风格)。

### 基金经理业绩（`get_fund_managers_performance`）

**描述**

查询基金经理、同类与基准的收益序列。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |
| `range` | enum | 是 | — | `month` / `tmonth` / `year` / `nowyear` / `now`。 |

**响应**

返回经理、同类和基准的收益序列；字段见 [基金经理业绩](../api/fund/fund-managers.md#managers-performance--基金经理业绩)。

## 在线回测

先查询可用指标，再构造回测条件。

### 基金回测指标（`get_fund_backtest_indicators`）

**描述**

返回上游定义的回测指标目录。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|

**响应**

返回指标编码、名称、操作符和状态规则；详见[基金回测可用指标](../api/fund/fund-backtest.md#backtest-indicators--基金回测可用指标)。

### 基金在线回测（`get_fund_backtest_result`）

**描述**

使用完整基金代码、买卖条件和定投参数执行在线回测，返回交易、指标与收益曲线。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 含市场后缀的完整基金代码，例如 `000001.OF`。 |
| `buy_conditions` | string | 是 | — | 买入条件 JSON 字符串。 |
| `sell_conditions` | string | 是 | — | 卖出条件 JSON 字符串。 |
| `buy_frequency_type` | string | 是 | — | 买入频率。 |
| `max_buy_times` | number | 是 | — | 最大买入次数。 |
| `per_buy_amount` | number | 是 | — | 每次买入金额。 |

**响应**

返回交易明细、回测指标与收益曲线；详见[基金在线回测](../api/fund/fund-backtest.md#backtest-result--基金在线回测)。

## 通用指标

选择画线序列或表格，确认指标与选择器。

### 基金画线指标（`get_fund_indicators_line`）

**描述**

查询按时间轴和 idx 关联的基金指标数值。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `indexes` | string | 是 | — | 分组 JSON 数组；每组 `thscodes` 为完整代码数组，`index_info` 包含 `index_id` 及可选 `attribute`。 |
| `time_range` | string | 是 | — | JSON 对象；`time_type` 必填，`start`、`end` 为 Unix 毫秒整数，`offset` 为整数周期偏移。 |

**响应**

返回 Unix 毫秒时间轴、指标元信息、完整 `thscode` 和数值数组；详见[基金画线指标](../api/fund/fund-indicators.md#indicators-line--基金画线指标)。

### 基金表格指标（`get_fund_indicators_table`）

**描述**

查询可选代码选择器、指标、分页和排序条件对应的表格结果。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `code_selectors` | string | 否 | — | JSON 对象；`stock_code`、`fund_code` 类型使用完整 `thscodes`，其它实体类型使用 `values`。 |
| `indexes` | string | 否 | — | JSON 数组；`index_id` 必填，`timestamp` 可选，正数为 Unix 毫秒、`0` 为最新位置、负数为位置偏移。 |
| `page_info` | string | 否 | — | JSON 对象；`page_begin`、`page_size`、`code_begin`、`code_page_size` 为可选整数，起点为 `0`。 |
| `sort` | string | 否 | — | JSON 数组；每项包含整数指标下标 `idx` 和排序方向字符串 `type`。 |

**响应**

返回总数、指标元信息、完整 `thscode`、指标值及 `part_order_thscodes`；详见[基金表格指标](../api/fund/fund-indicators.md#indicators-table--基金表格指标)。

## QDII 额度

分类额度汇总与基金明细列表。

### QDII额度列表（`get_fund_quota_list`）

**描述**

返回分类、子分类和基金列表，保留可空额度、收益率与共享基金额度类别列表。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `tab` | string | 是 | — | 分类字符串数组的 JSON，例如 `["remen"]`。 |
| `buy` | boolean | 否 | — | 可购状态过滤；省略时不设置该过滤。 |

**响应**

返回分类下的完整基金 `thscode`、名称、额度、近一年收益率和可空 `classify` 类别列表；详见[QDII额度列表](../api/fund/fund-quota.md#quota-list--qdii额度列表)。

### QDII额度汇总（`get_fund_quota_summary`）

**描述**

返回指定分类的无限额、限额、基金与可购数量。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `tab` | string | 是 | — | 分类字符串数组的 JSON，例如 `["nazhi100"]`。 |

**响应**

返回分类额度汇总；详见[QDII额度汇总](../api/fund/fund-quota.md#quota-summary--qdii额度汇总)。

## 资讯与募集

基金资讯和在售、待售基金。

### 基金资讯列表（`get_fund_news_article_list`）

**描述**

游标分页查询单只基金的资讯文章。上游不提供可靠的总记录数，因此响应不返回 `total`；是否翻页结束以 `has_more` 为准。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `limit` | integer | 否 | — | 返回条数。 |
| `offset` | string | 否 | — | 不透明翻页游标。 |

**响应**

返回 `{ timestamp, limit, offset, has_more, item[] }`，不包含 `total`；是否继续翻页以 `has_more` 为准。字段见 [基金资讯列表](../api/fund/news-article-list.md)。

### 基金募集列表（`get_fund_offerings_list`）

**描述**

查询当前募集或即将募集的新发基金。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `subscribe` | enum | 是 | — | `active` / `upcoming`。 |

**响应**

返回基金代码与募集起止时间；字段见 [基金募集列表](../api/fund/offerings-list.md)。

## 诊断

基金诊断数据。

### 基金诊断详情（`get_fund_diagnostics_detail`）

**描述**

查询基金诊断维度、同类对比与韧性指标。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

**响应**

返回诊断维度、同类维度、概率、区间和韧性结构；字段见 [基金诊断详情](../api/fund/diagnostics-detail.md)。

## 公司行动

查询基金分红记录。

### 基金分红记录（`get_fund_corporate_actions_dividends`）

**描述**

查询单只基金的历史分红记录。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

**响应**

返回现金分红、进度和关键日期；字段见 [基金分红记录](../api/fund/corporate-actions-dividends.md)。
