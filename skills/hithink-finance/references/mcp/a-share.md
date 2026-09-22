# A 股 MCP 工具

股票价格、财务、估值、竞价与特色数据。指数走势进入指数域，基金净值进入基金域。

## 行情

查询当前价格选择行情快照，查询历史价格序列选择历史 K 线。

### A股历史K线（`get_a_share_prices_historical`）

**描述**

获取单只 A 股标的的历史 K 线数据，窗口最长 10 年。支持前复权 / 后复权 / 不复权。
每次只能传一个 `thscode`，多标的请分多次调用。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号。 |
| `interval` | enum | 是 | `1d` | K 线周期，**当前仅支持** `1d`(日线)。 |
| `start` | long | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒 Unix 时间戳。`end - start` 不超过 10 年。 |
| `adjust` | enum | 否 | `forward` | 复权方式：`none` / `forward` / `backward`。 |

**响应**

返回 `{ timestamp, item: [PriceBarItem, ...] }`。字段含义见 [历史 K 线](../api/a-share/prices.md#prices-historical--响应字段)。

### A股行情快照（`get_a_share_prices_snapshot`）

**描述**

获取 A 股行情快照。`thscodes` 显式给定时按入参顺序批量取数；省略时遍历完整 A 股代码表
并按 `limit`/`offset` 分页。返回每只标的的最新价、涨跌额、涨跌幅、开盘 / 最高 / 最低 / 前收价、成交量、成交额。
不返回中文名 `name`，如需展示请配合 `get_meta_tickers_search` / `get_meta_tickers_list`。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 否 | — | 逗号分隔的 thscode 列表，如 `600519.SH,000001.SZ`。给定时忽略 `limit` / `offset`。 |
| `limit` | integer | 否 | `100` | 分页大小，仅在 `thscodes` 省略时生效。 |
| `offset` | integer | 否 | `0` | 分页偏移，仅在 `thscodes` 省略时生效。 |

**响应**

返回 `{ timestamp, total, item: [PriceSnapshotItem, ...] }`。字段含义见 [行情快照](../api/a-share/prices.md#prices-snapshot--响应字段)。

## 财务报表与指标

明确报告期、报表类型与指标含义。

### 资产负债表（`get_a_share_financials_balance_sheets`）

**描述**

获取单只 A 股标的的整体合并资产负债表多期序列。取数模式同利润表：不传 `start`/`end`
返回最近 `limit` 期；同时传 `start`+`end` 返回时间区间内全部报告期。均按 `period_end`
降序。返回资产总计、流动资产、货币资金、负债合计、股东权益合计等字段。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号；含交易所后缀（如 `000858.SZ`）。 |
| `period` | string | 是 | `annual` | 报告期类型：`annual`(仅 Q4) / `quarterly`(每季度末)。 |
| `limit` | integer | 否 | `4` | 最近 N 期模式：范围 `[1, 20]`。与 `start`/`end` 互斥。 |
| `start` | long | 否 | — | 时间区间模式：起始毫秒戳，需与 `end` 同传；窗口 ≤ 10 年。 |
| `end` | long | 否 | — | 时间区间模式：结束毫秒戳，`end >= start`。 |

**响应**

返回 `{ timestamp, item: [BalanceSheetItem, ...] }`，按 `period_end` 降序。
字段含义见 [资产负债表返回字段](../api/a-share/financials.md#financials-balance-sheets--balance-sheets-return-fields) 与
[共有响应字段](../api/a-share/financials.md#financials-balance-sheets--共有响应字段)。

### 现金流量表（`get_a_share_financials_cash_flow_statements`）

**描述**

获取单只 A 股标的的整体合并现金流量表多期序列。取数模式同利润表：不传 `start`/`end`
返回最近 `limit` 期；同时传 `start`+`end` 返回时间区间内全部报告期。均按 `period_end`
降序。返回经营 / 投资 / 筹资活动现金流量净额、现金及现金等价物净增加额等字段。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号；含交易所后缀（如 `600519.SH`）。 |
| `period` | string | 是 | `annual` | 报告期类型：`annual`(仅 Q4) / `quarterly`(每季度末)。 |
| `limit` | integer | 否 | `4` | 最近 N 期模式：范围 `[1, 20]`。与 `start`/`end` 互斥。 |
| `start` | long | 否 | — | 时间区间模式：起始毫秒戳，需与 `end` 同传；窗口 ≤ 10 年。 |
| `end` | long | 否 | — | 时间区间模式：结束毫秒戳，`end >= start`。 |

**响应**

返回 `{ timestamp, item: [CashFlowStatementItem, ...] }`，按 `period_end` 降序。
字段含义见 [现金流量表返回字段](../api/a-share/financials.md#financials-cash-flow-statements--cash-flow-statements-return-fields) 与
[共有响应字段](../api/a-share/financials.md#financials-cash-flow-statements--共有响应字段)。

### 利润表（`get_a_share_financials_income_statements`）

**描述**

获取单只 A 股标的的整体合并利润表多期序列。两种取数模式互斥：不传 `start`/`end`
返回最近 `limit` 期；同时传 `start`+`end` 返回时间区间内全部报告期。均按 `period_end`
降序。返回营业收入、营业利润、净利润、归母净利润、基本每股收益等字段。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号；含交易所后缀（如 `600519.SH`）。 |
| `period` | string | 是 | `annual` | 报告期类型：`annual`(仅 Q4) / `quarterly`(每季度末)。 |
| `limit` | integer | 否 | `4` | 最近 N 期模式：范围 `[1, 20]`。与 `start`/`end` 互斥。 |
| `start` | long | 否 | — | 时间区间模式：起始毫秒戳，需与 `end` 同传；窗口 ≤ 10 年。 |
| `end` | long | 否 | — | 时间区间模式：结束毫秒戳，`end >= start`。 |

**响应**

返回 `{ timestamp, item: [IncomeStatementItem, ...] }`，按 `period_end` 降序。
字段含义见 [利润表返回字段](../api/a-share/financials.md#financials-income-statements--income-statements-return-fields) 与
[共有响应字段](../api/a-share/financials.md#financials-income-statements--共有响应字段)。

### 财务指标数据（`get_a_share_financials_indicators`）

**描述**

获取单只 A 股在指定报告期的财务指标数据，一次返回成长、盈利、偿债、营运、现金流五类能力下的指标 ID 与本期值。

`report` 格式为 `yyyy-1`、`yyyy-2`、`yyyy-3`、`yyyy-4`，其中 `1` 一季报、`2` 中报、`3` 三季报、`4` 年报。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | `300033.SZ` | 单只标的 thscode，含交易所后缀。 |
| `report` | string | 是 | `2025-1` | 报告期，格式见上方说明。 |

**响应**

返回 `{ thscode, report, abilities }`。`abilities[]` 按 `growth`、`profitability`、`solvency`、`operation`、`cash-flow` 顺序排列；每个能力块的 `indicators[]` 仅含 `index_id` / `value`。

`index_id` 使用 REST 文档列出的接口契约字段名；`value` 为 `string | null`。服务端保留数据源原始数值字符串，不承诺固定小数位；上游空值或缺失值标准化为 `null`。百分比类指标按百分数值表达，周转率、比率、倍数类指标按指标名称对应单位解释。

字段含义见 [财务指标数据](../api/a-share/financials-indicators.md)。

## 特色数据

涨跌停与炸板、热榜、异动、龙虎榜；先确认是否支持历史。

### A股个股异动原因（`get_a_share_special_data_anomaly_analysis_stock`）

**描述**

按同花顺代码批量查询当日个股异动原因，按请求代码首次出现顺序返回匹配记录；
格式合法但当日无异动的代码会被忽略。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 是 | — | 逗号分隔的同花顺代码列表，例如 `600519.SH,000001.SZ`；支持 `SH` / `SZ` / `BJ` 后缀，大小写不敏感，去重前最多 50 个 token。 |

**响应**

返回 `{ timestamp, item: [AnomalyAnalysisItem, ...] }`。
字段含义见 [按股票查询个股异动原因](../api/a-share/anomaly-analysis.md#special-data-anomaly-analysis-stock--按股票查询个股异动原因)。

### A股龙虎榜（`get_a_share_special_data_dragon_tiger_list`）

**描述**

查询龙虎榜榜单。`board_type` 缺省为 `all`；`all` 为全部榜，`org` 为机构榜，
`hot_money` 为游资榜。`date` 可选，格式 `YYYY-MM-DD`；缺省由服务端取最新可用日期。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `board_type` | string | 否 | `all` | 榜单类型：`all` 全部 / `org` 机构榜 / `hot_money` 游资榜。 |
| `date` | string | 否 | 最新可用交易日 | 目标交易日，格式 `YYYY-MM-DD`。 |

**响应**

返回 `{ timestamp, board_type, trade_date, count, stock_count, stock_items, hot_money_items }`。
字段含义见 [龙虎榜榜单](../api/a-share/special-data-dragon-tiger-list.md#龙虎榜榜单)。

### A股热股榜（`get_a_share_special_data_hot_stock_list`）

**描述**

返回 A 股热股榜单。`period` 缺省为 `day`；`day` 表示 24 小时榜，`hour` 表示小时榜。
响应包含排名、热度、排名变化、涨跌停分析和标签信息。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `period` | string | 否 | `day` | 榜单周期：`day` 24 小时榜 / `hour` 小时榜。 |

**响应**

返回 `{ timestamp, item: [HotListItem, ...] }`。字段含义见 [A股热股榜单](../api/a-share/hot-list-data.md#special-data-hot-stock-list--a股热股榜单)。

### A股历史热股榜（`get_a_share_special_data_hot_stock_list_history`）

**描述**

查询指定自然日的 A 股历史热股榜排行。调用方只需要传 `YYYY-MM-DD` 自然日，
服务端按 `Asia/Shanghai` 当日 00:00 转换上游时间戳。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date` | string | 是 | — | 目标自然日，格式 `YYYY-MM-DD`；只支持一年内数据。 |

**响应**

返回 `{ date, date_ms, item: [HotListHistoryItem, ...] }`。`date` / `date_ms` 是整批榜单日期，
不会在每个 `item` 内重复出现。字段含义见 [历史热股排行](../api/a-share/hot-list-data.md#special-data-hot-stock-list-history--历史热股排行)。

### A股热股排名趋势（`get_a_share_special_data_hot_stock_rank_trend`）

**描述**

查询单只 A 股在指定日期区间内的热股榜排名走势。`thscode` 必填且仅支持单只；
`start_date` / `end_date` 使用 `YYYY-MM-DD`，查询窗口限制在一年内。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 A 股 thscode，不接受逗号，例如 `300033.SZ`。 |
| `start_date` | string | 是 | — | 起始日期，格式 `YYYY-MM-DD`。 |
| `end_date` | string | 是 | — | 结束日期，格式 `YYYY-MM-DD`。 |

**响应**

返回 `{ timestamp, item: [HotListRankTrendItem, ...] }`。字段含义见 [个股排名走势](../api/a-share/hot-list-data.md#special-data-hot-stock-rank-trend--个股排名走势)。

### A股炸板池（`get_a_share_special_data_limit_break_pool`）

**描述**

按交易日分页查询 A 股涨停炸板股票池。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date_ms` | integer | 否 | 当前自然日 | 上海时区零点毫秒时间戳。 |
| `page` | integer | 否 | `1` | 页码，从 `1` 开始。 |
| `size` | integer | 否 | `50` | 每页条数，范围 `1..200`。 |
| `sort_field` | enum | 否 | `price_change_ratio_pct` | `price_change_ratio_pct` / `open_times` / `last_price` / `turnover_ratio_pct` / `turnover`。 |
| `sort_dir` | enum | 否 | `desc` | `asc` / `desc`。 |

**响应**

返回 `{ timestamp, pagination, item[] }`；字段见 [炸板股票池](../api/a-share/limit-up-data.md#special-data-limit-break-pool--炸板股票池)。

### A股跌停池（`get_a_share_special_data_limit_down_pool`）

**描述**

按交易日分页查询 A 股跌停股票池。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date_ms` | integer | 否 | 当前自然日 | 上海时区零点毫秒时间戳。 |
| `page` | integer | 否 | `1` | 页码，从 `1` 开始。 |
| `size` | integer | 否 | `50` | 每页条数，范围 `1..200`。 |
| `sort_field` | enum | 否 | `last_limit_time` | `last_limit_time` / `first_limit_time` / `last_price` / `price_change_ratio_pct` / `turnover_ratio_pct`。 |
| `sort_dir` | enum | 否 | `desc` | `asc` / `desc`。 |

**响应**

返回 `{ timestamp, pagination, item[] }`；字段见 [跌停股票池](../api/a-share/limit-up-data.md#special-data-limit-down-pool--跌停股票池)。

### A股涨停天梯（`get_a_share_special_data_limit_up_ladder`）

**描述**

返回 A 股近 30 个交易日的连板梯队矩阵（按日期 -> 6 个板 -> 股票列表），
用于近期连板分布、次日晋级追踪等分析。无入参；上游当前固定返回 30 日，每个板位最多 4 只。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无入参。 |

**响应**

返回 `{ timestamp, window, item: [LimitUpLadderItem, ...] }`。
字段含义见 [连板天梯](../api/a-share/limit-up-data.md#special-data-limit-down-pool--响应字段)。

### A股涨停池（`get_a_share_special_data_limit_up_pool`）

**描述**

按交易日返回 A 股涨停 / 连板股票池，后端固定取全部连板与 `main,chinext,ssestar,north` 四类板块。
返回字段聚焦涨停语义，包括涨停时间、涨停原因、连板天数和封单额。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date_ms` | integer | 否 | — | 查询交易日 Unix 毫秒戳（Asia/Shanghai 00:00:00）；省略时回退到服务端当前自然日。 |
| `page` | integer | 否 | `1` | 页码，必须 `>= 1`。 |
| `size` | integer | 否 | `50` | 分页大小，上限 `200`。 |
| `sort_field` | enum | 否 | `last_price` | 排序字段：`last_price` / `continue_day_cnt` / `seal_money` / `limit_up_time`。 |
| `sort_dir` | enum | 否 | `desc` | 排序方向：`asc` / `desc`。 |

**响应**

返回 `{ timestamp, pagination, item: [LimitUpPoolItem, ...] }`。
字段含义见 [涨停股票池](../api/a-share/limit-up-data.md#special-data-limit-up-pool--响应字段)。

### A股飙升榜（`get_a_share_special_data_skyrocket_list`）

**描述**

返回 A 股飙升热榜。`period` 缺省为 `day`；`day` 表示日榜，`hour` 表示小时榜。
响应按热榜排名正序返回，包含排名、热度、排名变化和排名趋势。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `period` | string | 否 | `day` | 榜单周期：`day` 日榜 / `hour` 小时榜。 |

**响应**

返回 `{ timestamp, item: [HotListItem, ...] }`。字段含义见 [飙升榜](../api/a-share/hot-list-data.md#special-data-skyrocket-list--飙升榜)。

## 集合竞价

实时或终态竞价快照、短期基准。

### 短线风向标竞价基准（`get_a_share_auction_short_term_benchmark`）

**描述**

查询短线风向标集合竞价基准数据。未指定日期或传入空字符串时，默认查询 `Asia/Shanghai` 当日；显式指定非交易日时不自动回退。
返回的 `date` / `date_ms` 是最终查询日期，`timestamp` 是接口响应组装时间。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date` | string | 否 | 上海时区当日 | `yyyy-MM-dd` 格式；缺失或空字符串时使用 `Asia/Shanghai` 当日。 |

**响应**

返回 `{ timestamp, date, date_ms, item[] }`。`timestamp` 是接口响应组装时间，`date` / `date_ms` 是最终查询日期；明细包含标准代码、名称、竞价涨跌幅和标签。字段见 [短线风向标竞价基准](../api/a-share/auction.md#auction-short-term-benchmark--短线风向标竞价基准)。

### A股集合竞价快照（`get_a_share_auction_snapshot`）

**描述**

查询一个或多个 A 股标的的集合竞价快照。
`timestamp` 是接口响应组装时间，实时、终态、停牌及 `not_ready` 场景均会返回；上游行情时间仅用于判断数据新鲜度。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 是 | — | 多个 A 股 thscode 使用英文逗号分隔；单次调用当前最多 100 个，按分隔后的原始 token 数在去重前校验。 |
| `stage` | enum | 否 | `final` | `live` / `final`。 |

**响应**

返回接口响应组装时间、集合竞价阶段、数据状态、总数及竞价明细；字段见 [A股集合竞价快照](../api/a-share/auction.md#auction-snapshot--a股集合竞价快照)。

## 交易日程

交易日、交易时段与会话时间。

### A股交易日历（`get_a_share_calendar_trading_days`）

**描述**

获取 A 股近一年交易日序列，固定窗口为 `[今日 - 1 年, 今日]`（Asia/Shanghai 自然日），
无任何请求参数。每个交易日同时返回毫秒戳 `date_ms` 与可读日期 `date`（`yyyyMMdd`），
按时间升序。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无入参。 |

**响应**

返回 `{ timestamp, item: [TradingDayItem, ...] }`，按时间升序。
字段含义见 [交易日序列](../api/a-share/calendar-trading-days.md#响应字段)。

## 估值

查询估值快照，保留空值及负值。

### A股估值快照（`get_a_share_valuations_snapshot`）

**描述**

批量查询 A 股最新估值快照。`thscodes` 使用英文逗号分隔，大小写不敏感；
服务端会 trim、转为大写、去重并保留首次出现顺序，一次默认最多接受 100 个原始 token。

工具固定返回市盈率 TTM/MRQ、市净率 MRQ、市销率 TTM 和市现率 TTM 五个估值指标，
不提供历史估值、分页、指标选择或高低估结论。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 是 | `600519.SH,000001.SZ` | 英文逗号分隔的 A 股 thscode 列表；每项必须为六位数字加 `.SH`、`.SZ` 或 `.BJ`。 |

**响应**

返回 `{ timestamp, total, item: [ValuationSnapshotItem, ...] }`。`item[]` 固定包含
`thscode`、`ticker`、`name`、`pe_ttm`、`pe_mrq`、`pb_mrq`、`ps_ttm`、`pcf_ttm`。


指标值为 `number | null`，负值和高精度十进制值原样返回。上游未返回的股票不生成占位项；
无匹配记录时返回 `total=0`、`item=[]`。完整字段和错误码见 REST 文档
[估值数据](../api/a-share/valuations-snapshot.md)。

## 公司行动

查询 A 股复权因子和除权除息事件。

### 复权因子事件流（`get_a_share_corporate_actions_adjustment_factors`）

**描述**

获取单只 A 股标的的原始 cash-dividend / stock-dividend / rights-issue 事件流，
调用方据此自行推导前 / 后复权因子。已预计算的复权后价格请直接调用
`get_a_share_prices_historical` 并设置
`adjust=forward|backward`。每次只能传一个 `thscode`。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号。 |
| `from` | string | 否 | — | 事件起始日，格式 `YYYY-MM-DD`。 |
| `to` | string | 否 | — | 事件截止日，格式 `YYYY-MM-DD`。 |

**响应**

返回 `{ thscode, ticker, item: [AdjustmentFactorItem, ...] }`，`item` 按 `ex_date_ms` 降序排列。
字段含义见 [复权因子事件流](../api/a-share/corporate-actions-adjustment-factors.md#响应字段)。


注：响应不返回 `event_type` / `record_date` / `adjust_factor`，事件类型由 `dividend_per_share` 与 `per_share_bonus` 两个数值字段隐式区分。
