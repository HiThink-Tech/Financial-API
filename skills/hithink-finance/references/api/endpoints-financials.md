# 财务数据端点

> A 股财务报表（利润表 / 资产负债表 / 现金流量表）多期序列与财务指标。参数定义、响应字段以本文档为准。

## 通用说明

三张报表端点共享相同的参数模型和互斥规则：

- **必填**：`thscode`（单个，不接受逗号）、`period`（报告周期）。
- **互斥模式**：
  - 最近 N 期：省略 `start`/`end`，传 `limit`（1–20，默认 4）。
  - 时间区间：同时传 `start` AND `end`（毫秒时间戳），窗口 ≤ 10 年。
- 同时传 `(start|end)` 和 `limit` → `code=1004`。
- 只传 `start` 或 `end` 之一 → `code=1004`。
- `null` 字段表示「该报告期未披露」，**不要**补零。
- 三张报表的时间区间参数使用毫秒时间戳。

---

## 1. 利润表

```text
GET /api/a-share/financials/income-statements
```

获取单只 A 股的整体合并利润表多期序列。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscode` | query | string | 是 | 单只标的 thscode。 | — |
| `period` | query | string | 否 | 报告周期，枚举 `annual` / `quarterly`。 | `annual` |
| `limit` | query | integer | 否 | 最近 N 期，1–20。仅最近期模式可用。 | `4` |
| `start` | query | long | 否 | 区间起始时间（毫秒）。仅区间模式可用。 | — |
| `end` | query | long | 否 | 区间结束时间（毫秒）。仅区间模式可用，`end - start` ≤ 10 年。 | — |

### 请求示例

```bash
# 茅台最近 4 期年报利润表
curl 'https://fuyao.aicubes.cn/api/a-share/financials/income-statements?thscode=600519.SH&period=annual&limit=4' \
  -H 'X-api-key: <your-api-key>'

# 区间模式
curl 'https://fuyao.aicubes.cn/api/a-share/financials/income-statements?thscode=600519.SH&period=annual&start=1577836800000&end=1893456000000' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`，`item` 按 `period_end_ms` 降序排列（最新在前）。`null` 表示该报告期未披露。

`item[]` 元素字段（共 21 个）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `period` | string | 报告周期（`annual` / `quarterly`）。 |
| `period_end_ms` | long | 报告期末毫秒时间戳。 |
| `report_date_ms` | long | 报告日期毫秒时间戳。 |
| `fiscal_year` | integer | 会计年度。 |
| `fiscal_period` | string | 会计期间（如 `FY` 表示年报）。 |
| `currency` | string | 币种（A 股恒为 `CNY`）。 |
| `basic_eps` | number | 基本每股收益。 |
| `operating_income` | number | 营业收入。 |
| `operating_costs` | number | 营业成本。 |
| `operating_expenses` | number | 营业支出。 |
| `operating_profit` | number | 营业利润。 |
| `profit_total` | number | 利润总额。 |
| `net_profit` | number | 净利润。 |
| `parent_holder_net_profit` | number | 归属于母公司所有者的净利润。 |
| `income_tax_expense` | number | 所得税费用。 |
| `interest_expenses` | number | 利息支出。 |
| `manage_fee` | number | 管理费用。 |
| `sales_fee` | number | 销售费用。 |
| `research_and_development_expenses` | number | 研发费用。 |

---

## 2. 资产负债表

```text
GET /api/a-share/financials/balance-sheets
```

获取单只 A 股的整体合并资产负债表多期序列。

### 请求参数

参数结构与利润表完全一致：`thscode`、`period`、`limit` / `start`+`end`（互斥）。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/financials/balance-sheets?thscode=600519.SH&period=annual&limit=5' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`，`item` 按 `period_end_ms` 降序排列。`null` 表示该报告期未披露。

`item[]` 元素字段（共 15 个）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `period` | string | 报告周期。 |
| `period_end_ms` | long | 报告期末毫秒时间戳。 |
| `report_date_ms` | long | 报告日期毫秒时间戳。 |
| `fiscal_year` | integer | 会计年度。 |
| `fiscal_period` | string | 会计期间。 |
| `currency` | string | 币种。 |
| `total_current_assets` | number | 流动资产合计。 |
| `non_current_nets_total` | number | 非流动资产净值合计。 |
| `assets_total` | number | 资产总计。 |
| `total_debt` | number | 负债合计。 |
| `holder_equity_total` | number | 所有者权益合计。 |
| `cash` | number | 货币资金。 |
| `accounts_receivable` | number | 应收账款。 |

### 避错要点

- 把报告期模式理解为自然月数据：报表按报告期返回，不是按日历月。
- `limit` 最近期数通常 1–20，区间最长 10 年。

---

## 3. 现金流量表

```text
GET /api/a-share/financials/cash-flow-statements
```

获取单只 A 股的整体合并现金流量表多期序列。

### 请求参数

参数结构与利润表完全一致：`thscode`、`period`、`limit` / `start`+`end`（互斥）。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/financials/cash-flow-statements?thscode=600519.SH&period=quarterly&limit=8' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`，`item` 按 `period_end_ms` 降序排列。`null` 表示该报告期未披露。

`item[]` 元素字段（共 14 个）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `period` | string | 报告周期。 |
| `period_end_ms` | long | 报告期末毫秒时间戳。 |
| `report_date_ms` | long | 报告日期毫秒时间戳。 |
| `fiscal_year` | integer | 会计年度。 |
| `fiscal_period` | string | 会计期间。 |
| `currency` | string | 币种。 |
| `act_cash_flow_net` | number | 经营活动产生的现金流量净额。 |
| `invest_cash_flow_net` | number | 投资活动产生的现金流量净额。 |
| `financing_cash_flow_net` | number | 筹资活动产生的现金流量净额。 |
| `cash_equivalents_net_addition` | number | 现金及现金等价物净增加额。 |
| `pay_dividends_profits_interest_cash` | number | 分配股利、利润或偿付利息支付的现金。 |
| `pay_fixed_assets_etc_cash` | number | 购建固定资产等支付的现金。 |

### 避错要点

- 未对齐不同报表的报告期就直接拼接：三张报表的报告期可能不完全一致，拼接前确认 `period_end_ms`。

---

## 4. 财务指标

```text
GET /api/a-share/financials/indicators
```

按单只 A 股与报告期返回成长、盈利、偿债、运营和现金流五类指标。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscode` | query | string | 是 | 单只标的 thscode。 | — |
| `report` | query | string | 是 | 报告期，格式 `YYYY-[1-4]`。`1`=一季报、`2`=中报、`3`=三季报、`4`=年报。例如 `2025-1`。 | — |

### 请求示例

```bash
# 茅台 2024 年报财务指标
curl 'https://fuyao.aicubes.cn/api/a-share/financials/indicators?thscode=600519.SH&report=2024-4' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{thscode, report, abilities}`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `report` | string | 报告期标识。 |
| `abilities` | **array** | 指标块列表，固定顺序返回 5 个元素。 |

> **重要**：`abilities` 是**数组**（list），不是对象（object）。每个元素结构为 `{ability: string, indicators: [{index_id, value}...]}`。遍历方式为 `for ab in abilities: ab["ability"]` / `ab["indicators"]`，**不能**用 `abilities["growth"]` 访问。

`abilities[]` 元素结构：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ability` | string | 指标类别，枚举值见下表。 |
| `indicators` | array | 指标列表，每项为 `{index_id, value}`。 |

`abilities[]` 固定按以下顺序返回 5 个元素：

| 顺序 | `ability` 值 | 说明 |
| --- | --- | --- |
| 1 | `growth` | 成长能力指标 |
| 2 | `profitability` | 盈利能力指标 |
| 3 | `solvency` | 偿债能力指标 |
| 4 | `operation` | 运营能力指标 |
| 5 | `cash-flow` | 现金流指标 |

`indicators[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `index_id` | string | 指标 ID（如 `calculate_operating_income_yoy_growth_ratio`）。 |
| `value` | string \| null | 指标值（字符串类型）；上游缺失值返回 `null`，不是 `""` 或 `0`。 |

### 避错要点

- 用 `abilities["growth"]` 访问：`abilities` 是数组不是对象，必须用 `for ab in abilities: if ab["ability"] == "growth"` 遍历。
- 期待行业均值、评分、排名或点评：财务指标端点只返回标的自身指标，不返回行业数据。
- 把 `2025-12-31` 当 report：`report` 是专用字符串格式 `YYYY-[1-4]`，不是日期。
- 传毫秒时间戳：`report` 不是时间戳，是报告期枚举。
