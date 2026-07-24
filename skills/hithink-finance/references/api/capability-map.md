# 能力与意图路由

> 根据用户意图快速定位到具体 REST 端点。本页只做路由，参数与字段细节在各端点详情页。

## 全部端点一览（34 个）

### 元信息（2 个）

| 端点 | 用途 | 典型问题 |
| --- | --- | --- |
| `GET /api/meta/tickers/search` | 按 thscode / ticker / 中英文名做跨市场检索与消歧 | 「同花顺这只股票的 thscode 是什么」「帮我确认这个代码属于股票还是指数」 |
| `GET /api/meta/tickers/list` | 按交易所 / 资产类别批量获取代码表 | 「A 股全部代码列表」「沪深两市的股票有哪些」 |

详情：[endpoints-meta.md](endpoints-meta.md)

### 行情与公司行为（3 个）

| 端点 | 用途 | 典型问题 |
| --- | --- | --- |
| `GET /api/a-share/prices/snapshot` | 单只 / 多只 / 全市场 A 股最新行情快照 | 「贵州茅台最新价多少」「今天涨停的股票行情」 |
| `GET /api/a-share/prices/historical` | 单只 A 股历史日 K 线（支持前复权 / 后复权） | 「茅台最近一个月日 K」「三年前到现在的周线」 |
| `GET /api/a-share/corporate-actions/adjustment-factors` | 分红、送股、配股等复权事件流 | 「茅台历年分红记录」「某股票的除权除息事件」 |

详情：[endpoints-prices.md](endpoints-prices.md)

### 财务数据（4 个）

| 端点 | 用途 | 典型问题 |
| --- | --- | --- |
| `GET /api/a-share/financials/income-statements` | 整体合并利润表多期序列 | 「茅台最近 4 期年报利润表」 |
| `GET /api/a-share/financials/balance-sheets` | 整体合并资产负债表多期序列 | 「平安银行近 5 年资产负债表」 |
| `GET /api/a-share/financials/cash-flow-statements` | 整体合并现金流量表多期序列 | 「某股票近 3 年现金流」 |
| `GET /api/a-share/financials/indicators` | 指定报告期的五类财务指标 | 「茅台 2024 年报的财务指标」 |

详情：[endpoints-financials.md](endpoints-financials.md)

### 估值数据（1 个）

| 端点 | 用途 | 典型问题 |
| --- | --- | --- |
| `GET /api/a-share/valuations/snapshot` | 批量查询 A 股最新市盈率、市净率、市销率和市现率快照 | 「茅台和平安银行当前估值是多少」「批量获取这些股票的五项估值指标」 |

详情：[endpoints-valuations.md](endpoints-valuations.md)

### 交易日历（1 个）

| 端点 | 用途 | 典型问题 |
| --- | --- | --- |
| `GET /api/a-share/calendar/trading-days` | A 股近一年交易日序列 | 「最近有哪些交易日」「今天是否开盘」 |

详情：[endpoints-calendar.md](endpoints-calendar.md)

### 指数与板块（4 个）

| 端点 | 用途 | 典型问题 |
| --- | --- | --- |
| `GET /api/a-share-index/catalog/ths-index-list` | 按类别列出同花顺概念 / 区域 / 特色 / 行业指数 | 「有哪些概念板块」「同花顺行业指数列表」 |
| `GET /api/a-share-index/constituents/ths-stock-list` | 查询单个板块或标准指数的当前成分股 | 「沪深 300 成分股有哪些」「某概念板块包含哪些股票」 |
| `GET /api/a-share-index/prices/snapshot` | 批量查询指数 / 板块最新行情 | 「沪深 300 今天涨多少」「某板块最新行情」 |
| `GET /api/a-share-index/prices/historical` | 单只指数 / 板块历史日 / 周 / 月 K 线 | 「沪深 300 最近一年走势」「某概念板块历史 K 线」 |

详情：[endpoints-index.md](endpoints-index.md)

### 公募基金（7 个）

| 端点 | 用途 | 典型问题 |
| --- | --- | --- |
| `GET /api/fund/profile/detail` | 基金基本资料 | 「这只基金的管理人和基金经理是谁」 |
| `GET /api/fund/portfolio/holdings` | 定期披露重仓股 | 「这只基金披露了哪些重仓股」 |
| `GET /api/fund/performance/nav` | 最新或固定区间净值 | 「这只基金近一年单位净值走势」 |
| `GET /api/fund/performance/returns` | 固定区间收益 | 「这只基金近一月、近一年和成立以来收益」 |
| `GET /api/fund/holders/detail` | 持有人结构 | 「机构和个人持有比例是多少」 |
| `GET /api/fund/market/snapshot` | ETF/LOF 场内快照 | 「510300.SH 当前价格多少」 |
| `GET /api/fund/market/historical` | ETF 历史日线 | 「510300.SH 最近一年的日线行情」 |

详情：[endpoints-fund.md](endpoints-fund.md)

### 特色数据（9 个）

| 端点 | 用途 | 典型问题 |
| --- | --- | --- |
| `GET /api/a-share/special-data/limit-up-pool` | 指定交易日的涨停 / 连板股票池 | 「今天有哪些涨停股」「某天的涨停股清单」 |
| `GET /api/a-share/special-data/limit-up-ladder` | 近 30 个交易日的连板梯队矩阵 | 「最近连板情况如何」「连板天梯」 |
| `GET /api/a-share/special-data/anomaly-analysis-list` | 当日全市场个股异动原因（REST only） | 「今天哪些股票异动了」 |
| `GET /api/a-share/special-data/anomaly-analysis-stock` | 按 thscode 批量查询当日个股异动原因 | 「茅台今天为什么异动」「这几只股票的异动原因」 |
| `GET /api/a-share/special-data/skyrocket-list` | A 股飙升榜 | 「今天哪些股票飙升」 |
| `GET /api/a-share/special-data/hot-stock-list` | 当前热股榜 | 「今天的热门股票有哪些」 |
| `GET /api/a-share/special-data/hot-stock-list-history` | 指定日期的历史热股排名 | 「上周某天的热股榜」 |
| `GET /api/a-share/special-data/hot-stock-rank-trend` | 单只股票在日期区间的热榜排名走势 | 「茅台最近热度排名变化」 |
| `GET /api/a-share/special-data/dragon-tiger-list` | 龙虎榜（全部 / 机构 / 游资） | 「今天的龙虎榜」「某天的游资榜」 |

详情：[endpoints-special-data.md](endpoints-special-data.md)

### 全市场数据导出（3 个）

| 端点 | 用途 | 典型问题 |
| --- | --- | --- |
| `GET /api/dump/market-dumps/daily-k/download-url` | 全市场 10 年日K Parquet 下载链接 | 「下载全市场历史日K」「批量导出 A 股数据」「自建数据库」 |
| `GET /api/dump/market-dumps/daily-k-10d/download-url` | 全市场近 10 交易日 Parquet 下载链接 | 「增量同步最新行情」「每天更新全市场数据」 |
| `GET /api/dump/market-dumps/adjustment-factors/download-url` | 全市场复权事件 Parquet 下载链接 | 「下载所有股票分红送股记录」「批量获取复权因子」 |

> ⚠️ 这些端点返回 S3 预签名下载 URL（有效期约 5 分钟），不直接返回数据。拿到 URL 后需再次 HTTP GET 下载 Parquet 文件。**不要用逐只 `prices-historical` 拉全市场**——全市场约 5000+ 只票，逐只调需数千次 HTTP 请求，用本端点 3 次请求即可。

详情：[endpoints-market-dumps.md](endpoints-market-dumps.md)

## 常见组合流程

### 名称到数据

1. 用 `/api/meta/tickers/search?q=<名称>` 消歧为唯一 `thscode`。
2. 判断 `asset_type`：`a-share` 走个股端点，`a-share-index` 走指数端点，`fund-*` 走基金端点。
3. 调用对应行情、财务、估值或特色数据端点。

### 概念板块到成分股行情

1. 用 `/api/a-share-index/catalog/ths-index-list?tag=cn_concept` 找到板块 `thscode`。
2. 用 `/api/a-share-index/constituents/ths-stock-list?thscode=<板块代码>` 取当前成分股。
3. 仅对用户需要的有限成分调用 `/api/a-share/prices/snapshot?thscodes=<逗号列表>` 获取行情；全量结果落盘，不写入对话。

### 财务与行情联合分析

1. 用财报端点获取指定报告期数据。
2. 用行情端点获取明确时间窗口的数据。
3. 明确报告期、行情日期、复权口径和数据时间，避免把不同口径直接比较。

### 多股票估值快照

1. 用元信息端点把名称或纯 ticker 消歧为唯一 A 股 `thscode`。
2. 把有限标的合并为逗号分隔列表调用 `/api/a-share/valuations/snapshot`；原始 token 最多 100 个。
3. 保留 `null` 和负数，按 `timestamp` 标记数据时间，不把估值指标直接解释为投资建议。

## 能力边界

- 覆盖 **A 股**（沪深京）、**A 股指数 / 板块**和公募基金资料/披露/净值/收益；场内行情覆盖 ETF/LOF 快照与 ETF 日线。
- **不覆盖**：分钟 K、tick、Level-2、港股、美股、基金申赎交易、基金风险指标、期货、期权。
- 财务指标端点不返回行业均值、评分、排名或点评。
- 端点提供数据，不提供回测引擎、alpha 模型或确定性投资建议。
- 异动分析（`anomaly-analysis-list` / `anomaly-analysis-stock`）仅支持当日快照，不支持历史查询。

## 参数语义提醒

- `thscode` 必须带交易所后缀（`.SH` / `.SZ` / `.BJ` / `.TI`），纯 6 位代码不被接受。
- 毫秒时间戳（`start` / `end` / `date_ms`）与 `YYYY-MM-DD` 字符串（`from` / `to` / `date`）不可互换，按端点详情页要求传参。
- `limit/offset` 与 `page/size` 是两种不同分页模型，不要混用。
- 端点名相似时先确认资产类别、是否支持批量、是否允许省略代码，以及时间窗口上限。
