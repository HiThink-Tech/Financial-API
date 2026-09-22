# 资产负债表

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_financials_balance_sheets`
>
> 对应 REST 端点：[`GET /api/a-share/financials/balance-sheets`](../../api/a-share/financials.md#financials-balance-sheets--资产负债表)


## 工具描述

> 获取单只 A 股标的的整体合并资产负债表多期序列。取数模式同利润表：不传 `start`/`end`
> 返回最近 `limit` 期；同时传 `start`+`end` 返回时间区间内全部报告期。均按 `period_end`
> 降序。返回资产总计、流动资产、货币资金、负债合计、股东权益合计等字段。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号；含交易所后缀（如 `000858.SZ`）。 |
| `period` | string | 是 | `annual` | 报告期类型：`annual`(仅 Q4) / `quarterly`(每季度末)。 |
| `limit` | integer | 否 | `4` | 最近 N 期模式：范围 `[1, 20]`。与 `start`/`end` 互斥。 |
| `start` | long | 否 | — | 时间区间模式：起始毫秒戳，需与 `end` 同传；窗口 ≤ 10 年。 |
| `end` | long | 否 | — | 时间区间模式：结束毫秒戳，`end >= start`。 |

## 调用示例

```text
工具：get_a_share_financials_balance_sheets
参数：
  - thscode: "000858.SZ"
  - period: "quarterly"
```

## 返回

返回 `{ timestamp, item: [BalanceSheetItem, ...] }`，按 `period_end` 降序。
字段含义见 REST 端点 [资产负债表返回字段](../../api/a-share/financials.md#financials-balance-sheets--balance-sheets-return-fields) 与
[共有响应字段](../../api/a-share/financials.md#financials-balance-sheets--共有响应字段)。

```json
{
  "timestamp": 1735574400000,
  "item": [
    {
      "thscode": "000858.SZ",
      "ticker": "000858",
      "period": "quarterly",
      "fiscal_year": 2024,
      "fiscal_period": "Q4",
      "report_date_ms": 1735574400000,
      "period_end_ms": 1735574400000,
      "currency": "CNY",
      "assets_total": 250000000000,
      "total_current_assets": 200000000000,
      "non_current_nets_total": 50000000000,
      "cash": 130000000000,
      "accounts_receivable": 500000000,
      "total_debt": 60000000000,
      "holder_equity_total": 190000000000
    }
  ]
}
```
