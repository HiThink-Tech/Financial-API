# MCP 能力与意图总览

本页是同花顺金融数据服务 4 个 MCP 端点、29 个工具的固化功能契约，用于 Agent 的意图识别和工具路由。当前连接的 `tools/list` 用于确认实际可用性与调用 schema，不应取代本页的任务语义。

## 先选服务

| 用户目标 | 服务 | 工具选择 |
| --- | --- | --- |
| 名称、代码或 `thscode` 消歧 | `hithink-finance-meta` | `get_meta_tickers_search` |
| 批量获取 A 股或指数代码表 | `hithink-finance-meta` | `get_meta_tickers_list`，按分页迭代 |
| A 股最新行情或历史 K 线 | `hithink-finance-a-share` | `get_a_share_prices_snapshot` / `get_a_share_prices_historical` |
| 分红、送股、配股等复权事件 | `hithink-finance-a-share` | `get_a_share_corporate_actions_adjustment_factors` |
| 利润表、资产负债表、现金流量表 | `hithink-finance-a-share` | 对应 `get_a_share_financials_*` 工具 |
| 指定报告期的财务指标 | `hithink-finance-a-share` | `get_a_share_financials_indicators` |
| 交易日历 | `hithink-finance-a-share` | `get_a_share_calendar_trading_days` |
| 涨停池、连板、个股异动、热榜、龙虎榜 | `hithink-finance-a-share` | 对应 `get_a_share_special_data_*` 工具 |
| 查找概念、区域、特色或行业指数 | `hithink-finance-a-share-index` | `get_a_share_index_catalog_ths_index_list` |
| 查询指数或板块成分股 | `hithink-finance-a-share-index` | `get_a_share_index_constituents_ths_stock_list` |
| 指数/板块最新行情或历史 K 线 | `hithink-finance-a-share-index` | `get_a_share_index_prices_snapshot` / `get_a_share_index_prices_historical` |
| 基金资料、披露、净值、收益或持有人结构 | `hithink-finance-fund` | 对应 `get_fund_*` 工具 |
| ETF/LOF 实时行情 | `hithink-finance-fund` | `get_fund_market_snapshot` |
| ETF 历史日线 | `hithink-finance-fund` | `get_fund_market_historical` |

## 常见组合流程

### 名称到数据

1. 用 `get_meta_tickers_search` 将名称消歧为唯一 `thscode`。
2. 根据 `asset_type` 选择 A 股或指数服务。
3. 调用对应行情、财务或特色数据工具。

### 基金名称到数据

1. 用 `get_meta_tickers_search` 查询名称，可传 `asset_type=fund-otc,fund-etf,fund-lof,fund-reits`。
2. 根据唯一结果把 `fund-*` 叶子类型映射到 `fund_type=otc/exchange/reits`。
3. 资料/披露/净值/收益/持有人走基金业务工具；ETF/LOF 快照走 `get_fund_market_snapshot`，ETF 日线走 `get_fund_market_historical`。

### 概念板块到成分股行情

1. 用 `get_a_share_index_catalog_ths_index_list` 按 tag 找板块代码。
2. 用 `get_a_share_index_constituents_ths_stock_list` 取当前成分股。
3. 仅对用户需要的有限成分调用 A 股行情；全量结果落盘，不写入对话。

### 财务与行情联合分析

1. 用三张报表或财务指标工具获取指定报告期数据。
2. 用 A 股行情工具获取明确时间窗口的数据。
3. 明确报告期、行情日期、复权口径和数据时间，避免把不同口径直接比较。

## 按需连接检查

- 不要在任务开始时对三个服务执行全量连接探测。
- 仅检查意图命中的服务；若名称尚未消歧，先检查 `hithink-finance-meta`。
- `tools/list` 只需在首次调用、连接诊断或参数错误后读取，不要每次重复加载完整 schema。
- 遇到 `code=2003` 或 `Invalid or revoked API key`，按主入口的认证恢复流程处理，不要改用模拟数据。

## 参数语义提醒

- `thscode` 通常包含交易所或指数后缀；股票、标准指数和 `.TI` 板块的可用工具不同。
- 毫秒时间戳与 `YYYY-MM-DD` 字符串不可互换，按对应工具契约传参。
- `limit/offset` 与 `page/size` 是不同分页模型，不要混用。
- 工具名相似时先确认资产类别、是否支持批量、是否允许省略代码以及时间窗口上限。

## 能力边界

- 当前快照覆盖 A 股、A 股指数/板块和公募基金资料/披露/净值/收益；场内行情覆盖 ETF/LOF 快照与 ETF 日线。
- 不覆盖分钟 K、tick、Level-2、港股、美股、基金申赎交易、基金风险指标或期货。
- 财务指标工具不返回行业、评分、排名、行业均值或点评。
- 工具提供数据，不提供回测引擎、alpha 模型或确定性投资建议。
- 若当前 `tools/list` 出现本快照未登记的新工具，可报告潜在版本差异；在契约更新前不要猜测其业务语义。
