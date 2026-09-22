# 现金流量表

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_financials_cash_flow_statements`
>
> 对应 REST 端点：[`GET /api/a-share/financials/cash-flow-statements`](../../api/a-share/financials.md#financials-cash-flow-statements--现金流量表)


## 工具描述

> 获取单只 A 股标的的整体合并现金流量表多期序列。取数模式同利润表：不传 `start`/`end`
> 返回最近 `limit` 期；同时传 `start`+`end` 返回时间区间内全部报告期。均按 `period_end`
> 降序。返回经营 / 投资 / 筹资活动现金流量净额、现金及现金等价物净增加额等字段。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号；含交易所后缀（如 `600519.SH`）。 |
| `period` | string | 是 | `annual` | 报告期类型：`annual`(仅 Q4) / `quarterly`(每季度末)。 |
| `limit` | integer | 否 | `4` | 最近 N 期模式：范围 `[1, 20]`。与 `start`/`end` 互斥。 |
| `start` | long | 否 | — | 时间区间模式：起始毫秒戳，需与 `end` 同传；窗口 ≤ 10 年。 |
| `end` | long | 否 | — | 时间区间模式：结束毫秒戳，`end >= start`。 |

## 调用示例

```text
工具：get_a_share_financials_cash_flow_statements
参数：
  - thscode: "600519.SH"
  - period: "annual"
  - start: 1577808000000
  - end: 1735574400000
```

## 返回

返回 `{ timestamp, item: [CashFlowStatementItem, ...] }`，按 `period_end` 降序。
字段含义见 REST 端点 [现金流量表返回字段](../../api/a-share/financials.md#financials-cash-flow-statements--cash-flow-statements-return-fields) 与
[共有响应字段](../../api/a-share/financials.md#financials-cash-flow-statements--共有响应字段)。

```json
{
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
```
