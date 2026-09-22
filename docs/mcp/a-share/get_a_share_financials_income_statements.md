# 利润表

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_financials_income_statements`
>
> 对应 REST 端点：[`GET /api/a-share/financials/income-statements`](../../api/a-share/financials.md#financials-income-statements--利润表)


## 工具描述

> 获取单只 A 股标的的整体合并利润表多期序列。两种取数模式互斥：不传 `start`/`end`
> 返回最近 `limit` 期；同时传 `start`+`end` 返回时间区间内全部报告期。均按 `period_end`
> 降序。返回营业收入、营业利润、净利润、归母净利润、基本每股收益等字段。

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
工具：get_a_share_financials_income_statements
参数：
  - thscode: "600519.SH"
  - period: "annual"
  - limit: 3
```

## 返回

返回 `{ timestamp, item: [IncomeStatementItem, ...] }`，按 `period_end` 降序。
字段含义见 REST 端点 [利润表返回字段](../../api/a-share/financials.md#financials-income-statements--income-statements-return-fields) 与
[共有响应字段](../../api/a-share/financials.md#financials-income-statements--共有响应字段)。

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
      "operating_income": 174144000000,
      "operating_profit": 124000000000,
      "net_profit": 93000000000,
      "parent_holder_net_profit": 86000000000,
      "basic_eps": 68.50
    }
  ]
}
```
