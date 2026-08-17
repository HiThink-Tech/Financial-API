# 公募基金端点

> 基金基本资料、披露数据、净值、收益、持有人结构以及场内基金行情。先通过元信息端点把名称或代码消歧为带后缀的唯一 `thscode`。

## 公共参数与类型

需要 `fund_type` 的端点使用以下枚举：

| 值 | 含义 |
| --- | --- |
| `otc` | 场外公募基金，对应 `asset_type=fund-otc` |
| `exchange` | 场内 ETF/LOF，对应 `fund-etf` 或 `fund-lof` |
| `reits` | 公募 REITs，对应 `fund-reits` |

`fund_type` 与 `thscode` 共同定位基金，不能传逗号分隔的多个 `fund_type`。场内行情端点不接收 `fund_type`，由服务端按 `thscode` 识别 ETF/LOF。

## 1. 基金基本资料

```text
GET /api/fund/profile/detail
```

参数：`fund_type`（必填）和单个 `thscode`（必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/profile/detail?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data` 为 `{timestamp, item[]}`，`item[]` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 基金唯一代码。 |
| `ticker` | string | 不带市场后缀的基金代码。 |
| `fund_name` | string/null | 基金名称。 |
| `estab_date` | integer/null | 成立日期，毫秒 Unix 时间戳。 |
| `company_id` | string/null | 基金公司 ID；用于基金公司详情能力。 |
| `mgmt_name` | string/null | 基金管理人名称。 |
| `manager_name` | string/null | 兼容字段；首位基金经理名称。 |
| `fund_scale` | number/null | 基金规模。 |
| `unit_nav` | number/null | 最新单位净值。 |
| `manager_info` | array | 全部当前经理引用；含 `manager_id`、`manager_name`、`tenure_return_pct`、`tenure_days`、`start_date_ms`、`end_date_ms`。 |
| `trade_rule` | array | 交易规则；含 `title`、`display_time`、`time_ms`。 |
| `rate_info` | array | 费率；含 `rate_type`、`charge_mode`、`condition`、`standard_rate`、`discounted_rate`。 |

### 避错要点

- 不要仅凭 `.OF`/`.SH` 后缀猜 `fund_type`；先查元信息的 `asset_type`。
- 可选资料字段可能为 `null`，不得补写虚构管理人或成立日。

## 2. 基金定期披露重仓股

```text
GET /api/fund/portfolio/holdings
```

参数：`fund_type`（必填）和单个 `thscode`（必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/holdings?fund_type=exchange&thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段：`thscode`、`ticker`、`stock_name`、`hold_ratio`、`asset_type`、`position_capital`、`position_count`、`security_market_value_rate_pct`、`period_increase_rate_pct`、`investment_rank`、`start_date_ms`、`end_date_ms`、`publish_date_ms`、`modify_time_ms`。`hold_ratio=8.88` 表示 8.88%，不是 0.0888。

`data` 还可能包含 `total_stock_ratio_pct`、`total_bond_ratio_pct`、`total_fund_ratio_pct`、`turnover_rate_pct`、`stock_ratio_pct`、`main_industry`、`concentration_ratio` 等披露汇总字段；未披露时保持 `null` 或省略。

### 避错要点

- 该端点是定期披露持仓，不是实时组合；回答中应注明披露口径和返回时间。
- 暂无可用披露时返回 `code=3002`，不要用相近基金或模拟持仓替代。

## 3. 基金净值

```text
GET /api/fund/performance/nav
```

| 参数 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| `fund_type` | string | 是 | `otc` / `exchange` / `reits`。 | — |
| `thscode` | string | 是 | 单个基金代码。 | — |
| `range` | string | 否 | `week` / `month` / `tmonth` / `hyear` / `year` / `twoyear` / `tyear` / `fyear`。省略时只返回最新点。 | — |
| `nav_type` | string | 否 | `unit` / `adj` / `unit,adj`。 | `unit,adj` |

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/nav?fund_type=otc&thscode=025480.OF&range=year&nav_type=unit%2Cadj' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `nav_date`、`unit_nav`、`adj_nav`。未选择的净值类型不出现在响应中；字段为空也不自动补零。

### 避错要点

- `range` 不是自然日期区间；不要传 `YYYY-MM-DD`。
- `nav_type=unit,adj` 含逗号，手写 URL 时应正确编码。

## 4. 基金区间收益

```text
GET /api/fund/performance/returns
```

参数：`fund_type`（必填）和单个 `thscode`（必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/returns?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段：

| 字段 | 口径 |
| --- | --- |
| `return_month` | 近一月 |
| `return_tmonth` | 近三月 |
| `return_hyear` | 近半年 |
| `return_year` | 近一年 |
| `return_tyear` | 近三年 |
| `return_fyear` | 近五年 |
| `return_nowyear` | 今年以来 |
| `return_now` | 成立以来 |

兼容扩展还包含 `return_week`、`return_twoyear`，以及近周/月/三月/半年/一年/两年/三年/五年的同类平均 `peer_average_*`、名次 `rank_*` 和同类总数 `rank_total_*`；例如 `peer_average_week`、`rank_total_fyear`。所有收益和同类平均均为百分数原值，排名字段为整数或 `null`。

### 避错要点

- 收益字段来自不同固定区间，不能把它们当成自定义起止日期收益。
- 收益数据未准备好时返回 `3002`；不要据此宣称基金收益为零。

## 5. 基金持有人结构

```text
GET /api/fund/holders/detail
```

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `fund_type` | string | 是 | 基金类型：`otc`（场外基金）、`exchange`（ETF/LOF）或 `reits`（公募 REITs）。 |
| `thscode` | string | 是 | 完整基金 `thscode`，必须保留市场后缀；例如 `161725.SZ`。 |
| `merge_scope` | string | 否 | 持有人披露口径：`all`（默认，分别返回合并/独立份额的最新记录）、`merged`（A 类、C 类等份额合并披露）或 `separate`（当前份额独立披露）。 |

```bash
curl 'https://fuyao.aicubes.cn/api/fund/holders/detail?fund_type=otc&thscode=025480.OF&merge_scope=all' \
  -H 'X-api-key: <your-api-key>'
```

`data.timestamp` 是返回记录中最新的报告日，使用毫秒 Unix 时间戳。`data.item[]` 是持有人结构记录；当 `merge_scope=all` 时，最多分别返回一条 `merged` 和 `separate` 的最新记录。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `merge_scope` | string | 实际命中的披露口径：`merged` 或 `separate`。 |
| `report_date_ms` | integer | 当前记录的报告日，毫秒 Unix 时间戳。 |
| `ins_position` | number | 机构投资者占比，百分数原值。 |
| `holder_amount` | integer | 基金份额持有人户数。 |
| `avg_holder_share` | number | 平均每户持有基金份额。 |
| `psnl_rate` | number | 个人投资者占比，百分数原值。 |
| `mgmt_staff_hold_rate` | number | 管理人员工持有比例，百分数原值。 |

### 避错要点

- 持有人数据是披露数据，不是实时账户统计。
- 百分比字段按上游百分数值解释，缺失值保持 `null`。
- `all` 是聚合查询口径，不是第三种披露记录；返回项的实际口径只会是 `merged` 或 `separate`。

## 6. 场内基金行情快照

```text
GET /api/fund/market/snapshot
```

参数：单个 `thscode`（必填）。支持 ETF 和 LOF；场外基金或 REITs 不支持时返回 `3004`。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/market/snapshot?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段：`thscode`、`ticker`、`last_price`、`open_price`、`high_price`、`low_price`、`prev_price`、`price_change_ratio_pct`、`price_change`、`price_amplitude_ratio_pct`、`volume`、`turnover`、`turnover_ratio_pct`。

### 避错要点

- 单次只接收一个 `thscode`，逗号分隔批量代码返回 `1002`。
- 场外基金没有交易所实时行情；先看 `asset_type`，不要盲目重试 `3004`。

## 7. ETF 历史日线行情

```text
GET /api/fund/market/historical
```

| 参数 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| `thscode` | string | 是 | 单个 ETF `thscode`。 | — |
| `interval` | string | 否 | 当前只支持 `1d`。 | `1d` |
| `start` | integer | 是 | 起始毫秒 Unix 时间戳。 | — |
| `end` | integer | 是 | 结束毫秒 Unix 时间戳；不得早于 `start`。 | — |

单次 `[start,end]` 最多 5 年。LOF、场外基金和 REITs 不支持该历史行情能力时返回 `3004`。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/market/historical?thscode=510300.SH&interval=1d&start=1704038400000&end=1735660799000' \
  -H 'X-api-key: <your-api-key>'
```

`data` 为 `{timestamp, thscode, interval, item[]}`；基金历史行情不提供 `adjust`。`item[]` 字段为 `date_ms`、`open_price`、`high_price`、`low_price`、`close_price`、`volume`、`turnover`。

### 避错要点

- 不要传复权参数；ETF 历史端点没有 `adjust`。
- 超过 5 年时拆成不重叠窗口，合并后按 `date_ms` 去重排序。
- 不要把 LOF 快照可用误解为 LOF 历史也可用；历史当前仅 ETF。

## 8. 基金公司详情

```text
GET /api/fund/companies/detail
```

参数：`company_id`（必填），从基金资料的 `company_id` 获取。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/companies/detail?company_id=<company-id>' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `company_id`、`company_name`、`company_type`、`established_date_ms`、`fund_count`、`scale`。

### 避错要点

- `company_id` 不是基金 ticker 或 `thscode`；先从基金资料发现。

## 9. 基金行业配置

```text
GET /api/fund/portfolio/industry-allocation
```

参数：`fund_type` 和单个 `thscode`（均必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/industry-allocation?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `report_period`、`industry_name`、`ratio_pct`。

### 避错要点

- 行业配置按报告期披露，不是实时行业暴露；`ratio_pct` 是百分数原值。

## 10. 历史业绩指标

```text
GET /api/fund/performance/indicators-historical
```

参数：`fund_type`、`thscode`、毫秒时间戳 `start`、`end` 均必填。区间必须有序且最多 5 年。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/indicators-historical?fund_type=otc&thscode=025480.OF&start=1704038400000&end=1735660799000' \
  -H 'X-api-key: <your-api-key>'
```

`data` 仅包含 `timestamp` 和 `item[]`；固定上游周期 `DAY_1` 不作为顶层响应字段，也不返回顶层 `thscode`、`interval`。`data.timestamp` 保留明确的上游数据时间；`item[]` 字段为 `date_ms`、`rsi_pct`、`donchian_channel`、`track_index_pe_ttm_five_year_percentile`。

### 避错要点

- `start/end` 缺一不可；超过 5 年应拆成不重叠窗口。

## 11. 最大回撤

```text
GET /api/fund/performance/drawdowns
```

参数：`fund_type` 和单个 `thscode`（均必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/drawdowns?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 含 `thscode`、`ticker` 及固定十个区间：`week`、`month`、`tmonth`、`hyear`、`year`、`twoyear`、`tyear`、`fyear`、`nowyear`、`now`。

### 避错要点

- 这些是固定区间回撤，不接收客户端自定义时间范围。

## 12. 前十大持有人

```text
GET /api/fund/holders/top
```

参数：`fund_type`、`thscode` 必填；`limit` 可选，最大 10。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/holders/top?fund_type=exchange&thscode=588000.SH&limit=10' \
  -H 'X-api-key: <your-api-key>'
```

`data` 为 `{timestamp, limit, item[]}`；`limit` 回显服务端实际采用的返回条数上限。`item[]` 字段为 `holder_id`、`holder_code`、`holder_name`、`holder_type`、`rank`、`hold_share`、`hold_rate_pct`、`report_date_ms`、`publish_date_ms`。

### 避错要点

- 持有人榜是报告期披露；`limit>10` 返回参数范围错误。

## 13. 基金分红

```text
GET /api/fund/corporate-actions/dividends
```

参数：`fund_type` 和单个 `thscode`（均必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/corporate-actions/dividends?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data` 可含汇总字段 `dividend_count`、`dividend_total`；`item[]` 字段为 `per_ten_cash_before_tax`、`per_ten_cash_after_tax`、`progress`、`publish_date_ms`、`registration_date_ms`、`ex_dividend_date_ms`、`payment_date_ms`、`reinvestment_date_ms`、`profit_base_date_ms`、`in_dividend_date_ms`。

### 避错要点

- 每十份现金分红与汇总金额口径不同，不要混为每份分红。

## 14. 基金诊断

```text
GET /api/fund/diagnostics/detail
```

参数：`fund_type` 和单个 `thscode`（均必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/diagnostics/detail?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `thscode`、`ticker`、`fund_type`、`peer_code`、`dimensions`、`peer_dimensions`、`probabilities`、`ranges`、`resilience`、`peer_resilience`。

### 避错要点

- 诊断维度是数据服务返回值，不等于基金推荐、风险承诺或投资建议。

## 15. 基金主要财务指标

```text
GET /api/fund/financials/indicators
```

参数：`fund_type` 和单个 `thscode`（均必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/financials/indicators?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `start_date_ms`、`end_date_ms`、`publish_date_ms`、`distribution_profit`、`current_profit`、`current_income`、`distribution_share_profit`、`average_nav_profit_margin`、`average_share_current_profit`、`share_nav`、`sum_nav_rate`、`asset_nav`、`sum_share_nav`、`nav_rate`。

### 避错要点

- 财务数据按披露期返回，空值不补零。

## 16. 基金利润表

```text
GET /api/fund/financials/income-statements
```

参数：`fund_type` 和单个 `thscode`（均必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/financials/income-statements?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 含 `start_date_ms`、`end_date_ms`、`publish_date_ms`，以及 `income`、`investment_income`、`stock_investment_income`、`bond_investment_income`、`fund_investment_income`、`dividend_income`、`interest_income`、`fair_value_income`、`exchange_income`、`other_income`、`total_income`、`fee`、`manager_reward`、`custodian_fee`、`transaction_cost`、`tax_surcharge`、`total_fee`、`total_profit`、`net_profit`。

### 避错要点

- 这是基金财务报表，不是上市公司利润表；不要混用 A 股财务端点。

## 17. 基金资产负债表

```text
GET /api/fund/financials/balance-sheets
```

参数：`fund_type` 和单个 `thscode`（均必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/financials/balance-sheets?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 含 `start_date_ms`、`end_date_ms`、`publish_date_ms`、`total_assets`、`bank_deposit`、`fund_investment`、`stock_investment`、`bond_investment`、`transactional_financial_assets`、`other_assets`、`total_liability`、`other_liability`、`owner_total_equity`、`undistributed_profit`、`liability_and_owner_equity`。

### 避错要点

- 按报告日对齐利润表和资产负债表，不要按返回数组下标直接拼接。

## 18. 基金经理投资风格

```text
GET /api/fund/managers/investment-style
```

参数：`manager_id`（必填），从基金资料的 `manager_info[]` 获取。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/investment-style?manager_id=<manager-id>' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `representative_fund_thscode`、`representative_fund_ticker`、`representative_fund_name`、`investment_idea`、`total_fund_scale`、`industry_preferences`。关联基金无法唯一解析时 `representative_fund_thscode=null`，主能力仍成功。

### 避错要点

- `manager_id` 不是经理姓名；关联基金代码为空不等于经理能力失败。

## 19. 基金经理业绩

```text
GET /api/fund/managers/performance
```

参数：`manager_id` 和 `range` 必填；`range` 可选 `month`、`tmonth`、`year`、`nowyear`、`now`。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/performance?manager_id=<manager-id>&range=year' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `date_ms`、`manager_return_pct`、`peer_return_pct`、`benchmark_return_pct`。

### 避错要点

- `range` 是固定枚举，不接收任意起止日期。

## 20. 基金经理从业经历

```text
GET /api/fund/managers/experience
```

参数：`manager_id`（必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/experience?manager_id=<manager-id>' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `awards`、`heavy_assets`、`investment_history`。

### 避错要点

- 未配置奖项或经历可为空，不应改写为请求失败。

## 21. 基金经理详情与雷达对比

```text
GET /api/fund/managers/detail
```

参数：`manager_id`（必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/detail?manager_id=<manager-id>' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `manager_id`、`manager_name`、`sex`、`degree`、`company_id`、`company_name`、`resume`、`photo_url`、`annual_return_pct`、`maximum_return_pct`、`radar_comparison`。`radar_comparison[]` 按 `fund_category + horizon` 对齐，含 `manager_metrics`、`manager_scores`、`peer_average_scores`。

### 避错要点

- 雷达节点只返回实际覆盖的类别和周期；不要补造缺失节点。

## 22. 基金资讯列表

```text
GET /api/fund/news/article-list
```

参数：`fund_type`、`thscode` 必填；`limit` 可选，默认 20、范围 1–100；`offset` 是可选不透明翻页游标。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/news/article-list?fund_type=otc&thscode=025480.OF&limit=20' \
  -H 'X-api-key: <your-api-key>'
```

`data` 含 `timestamp`、`limit`、`offset`、`has_more`、`item[]`，不提供不可靠的总条数。条目字段为 `id`、`content_type`、`title`、`summary`、`source`、`url`、`image_url`、`author`、`publish_time_ms`、`top`。

### 避错要点

- `offset` 不是整数页码；下一页必须使用响应返回的游标。
- 分页结束只以 `has_more=false` 为准，不根据本页条数推断，也不要读取不存在的 `total`。
- 资讯元数据不等于新闻原文授权，按返回 URL 和账号权限使用。

## 23. 基金募集列表

```text
GET /api/fund/offerings/list
```

参数：`subscribe`（必填），枚举 `active` / `upcoming`。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/offerings/list?subscribe=active' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `thscode`、`ticker`、`subscription_start_ms`、`subscription_end_ms`。新基金尚未进入权威代码表时 `thscode` 可以为 `null`。

### 避错要点

- `active/upcoming` 是募集状态；不要传上游数字枚举。
- `thscode=null` 不等于整批失败，保留 ticker 和募集时间。

## 24. 历史股票持仓

```text
GET /api/fund/portfolio/stock-history
```

参数：`fund_type`、`thscode`、`report_type`、`end_date` 均必填。`report_type` 与 `end_date` 应先从股票持仓报告日期端点发现。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/stock-history?fund_type=otc&thscode=025480.OF&report_type=<type>&end_date=<date>' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `thscode`、`ticker`、`name`、`asset_type`、`hold_ratio`、`market_value`、`period_increase_pct`、`rank`、`report_type`、`end_date_ms`。

### 避错要点

- 不要猜报告类型或截止日期；先调用 report-dates 能力。

## 25. 股票持仓报告日期

```text
GET /api/fund/portfolio/stock-report-dates
```

参数：`fund_type`、`thscode` 必填；`report_type` 可选。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/stock-report-dates?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `report_type`、`report_type_name`、`start_date_ms`、`end_date_ms`。

### 避错要点

- 返回列表是下一步历史持仓查询的有效参数来源。

## 26. 历史债券持仓

```text
GET /api/fund/portfolio/bond-history
```

参数与股票历史持仓一致：`fund_type`、`thscode`、`report_type`、`end_date` 均必填。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/bond-history?fund_type=otc&thscode=025480.OF&report_type=<type>&end_date=<date>' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段与股票历史持仓一致，`asset_type` 用于区分资产类型。

### 避错要点

- 债券代码不能假定具备 A 股交易所后缀；以返回的 `thscode`/`ticker` 为准。

## 27. 债券持仓报告日期

```text
GET /api/fund/portfolio/bond-report-dates
```

参数：`fund_type`、`thscode` 必填；`report_type` 可选。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/bond-report-dates?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `report_type`、`report_type_name`、`start_date_ms`、`end_date_ms`。

### 避错要点

- 股票与债券报告日期是不同能力，不要交叉复用发现结果。

## 28. 基金资产配置

```text
GET /api/fund/portfolio/asset-allocation
```

参数：`fund_type` 和单个 `thscode`（均必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/asset-allocation?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `report_date_ms`、`stock_ratio_pct`、`bond_ratio_pct`、`deposit_ratio_pct`、`other_ratio_pct`。

### 避错要点

- 各比例按报告期披露且为百分数原值；空值不补零，也不要强制归一化为 100。

## 基金专用错误语义

| `code` | 含义 | 调用方处理 |
| --- | --- | --- |
| `3001` | 未找到对应基金 | 先用 meta 搜索核对 `fund_type`、`asset_type` 与 `thscode`。 |
| `3002` | 数据尚未准备 | 保留 `request_id` 和数据口径，稍后再查；不得补零或用模拟数据。 |
| `3004` | 目标基金类型不支持该能力 | 改用适用于该 `asset_type` 的端点，不重试原请求。 |
