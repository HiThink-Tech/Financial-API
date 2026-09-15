# 现金流量表

[业务导航](README.md)

财务报表模块，提供 A 股整体合并报表（consolidated）多期序列，覆盖利润表、资产负债表、现金流量表。
三个接口入参契约**完全一致**，仅返回字段不同（见各自小节）。
所有接口均返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

- 所有金额字段单位为**原币元**，`basic_eps` 单位为**元/股**（量级远小于金额字段，不可做单位换算）；A 股币种恒为 `CNY`。
- 字段为 `null` 表示「该期未披露」，透传不补零。

<a id="取数模式"></a>

**取数模式**

三个接口共用两种取数模式，**互斥、二选一**：

| 模式 | 触发条件 | 行为 |
|---|---|---|
| 最近 N 期 | 不传 `start` / `end` | 返回最近 `limit` 期，按 `period_end` 降序。 |
| 时间区间 | 同时传 `start` + `end`（毫秒戳） | 返回 `[start, end]` 闭区间内全部报告期，按 `period_end` 降序。 |

同时传 `start`/`end` 与 `limit`，或仅传 `start`、仅传 `end`（半开区间），返回 `code=1004`。

<a id="共有请求参数"></a>

**共有请求参数**

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscode` | query | string | 是 | 单只标的 thscode，**不接受逗号**；含交易所后缀（如 `600519.SH` / `000858.SZ` / `430047.BJ`）。 | - |
| `period` | query | enum | 是 | 报告期类型：`annual`(仅 Q4 报告期) / `quarterly`(每个季度末)。 | `annual` |
| `limit` | query | integer | 否 | 最近 N 期模式：默认 4，范围 `[1, 20]`。**与 `start`/`end` 互斥**。 | `4` |
| `start` | query | long | 否 | 时间区间模式：起始毫秒戳，需与 `end` 同传；窗口跨度不超过 10 年。 | - |
| `end` | query | long | 否 | 时间区间模式：结束毫秒戳，`end >= start`。 | - |

<a id="共有响应字段"></a>

**共有响应字段**

每条 `item` 都含以下元数据字段，`data.timestamp` 取响应中最大的 `period_end_ms`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带交易所后缀的完整 thscode。 |
| `ticker` | string | 纯代码（不含后缀）。 |
| `period` | enum | 入参 `period` 回显。 |
| `fiscal_year` | int | 财年（自然年）。 |
| `fiscal_period` | string | `FY` / `Q1` / `Q2` / `Q3` / `Q4`。 |
| `report_date_ms` | long | 披露日（毫秒）。 |
| `period_end_ms` | long | 报告期末（Asia/Shanghai 零点毫秒戳）。 |
| `currency` | string | 币种，A 股恒为 `CNY`。 |

## 现金流量表

```text
GET /api/a-share/financials/cash-flow-statements
```

A 股整体合并现金流量表多期序列。取数模式与参数同利润表。

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号；含交易所后缀。 |
| `period` | enum | 是 | `annual` | `annual`（仅 Q4 报告期）/ `quarterly`（每个季度末）。 |
| `limit` | integer | 否 | `4` | 最近 N 期模式，范围 `[1, 20]`；与 `start` / `end` 互斥。 |
| `start` | long | 否 | — | 时间区间模式起始毫秒戳，需与 `end` 同传。 |
| `end` | long | 否 | — | 时间区间模式结束毫秒戳，需满足 `end >= start`。 |

### 请求示例

```bash
# 茅台 2020–2024 全部年报（时间区间模式）
# start = 2020-01-01 00:00:00+08:00 → 1577808000000
# end   = 2024-12-31 00:00:00+08:00 → 1735574400000
curl 'https://fuyao.aicubes.cn/api/a-share/financials/cash-flow-statements?thscode=600519.SH&period=annual&start=1577808000000&end=1735574400000' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "g7h8i9j0",
  "data": {
    "timestamp": 1735574400000,
    "item": [
      {
        "thscode": "600519.SH",
        "ticker": "600519",
        "period": "annual",
        "fiscal_year": 2024,
        "fiscal_period": "FY",
        "report_date_ms": 1735574400000,
        "period_end_ms": 1735574400000,
        "currency": "CNY",
        "act_cash_flow_net": 92000000000,
        "invest_cash_flow_net": -3000000000,
        "financing_cash_flow_net": -65000000000,
        "pay_fixed_assets_etc_cash": 3500000000,
        "pay_dividends_profits_interest_cash": 64000000000,
        "cash_equivalents_net_addition": 24000000000
      }
    ]
  }
}
```

<a id="cash-flow-statements-return-fields"></a>
### 返回字段

除上文“共有响应字段”外，现金流量表 `data.item[]` 还包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `act_cash_flow_net` | number | 经营活动产生的现金流量净额（原币元）。 |
| `invest_cash_flow_net` | number | 投资活动产生的现金流量净额（原币元）。 |
| `financing_cash_flow_net` | number | 筹资活动产生的现金流量净额（原币元）。 |
| `pay_fixed_assets_etc_cash` | number | 购建固定资产、无形资产和其他长期资产支付的现金（原币元）。 |
| `pay_dividends_profits_interest_cash` | number | 分配股利、利润或偿付利息支付的现金（原币元）。 |
| `cash_equivalents_net_addition` | number | 现金及现金等价物净增加额（原币元）。 |
