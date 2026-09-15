# 复权因子事件流

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_corporate_actions_adjustment_factors`
>
> 对应 REST 端点：[`GET /api/a-share/corporate-actions/adjustment-factors`](../../api/a-share/corporate-actions-adjustment-factors.md#复权因子事件流)


## 工具描述

> 获取单只 A 股标的的原始 cash-dividend / stock-dividend / rights-issue 事件流，
> 调用方据此自行推导前 / 后复权因子。已预计算的复权后价格请直接调用
> [`get_a_share_prices_historical`](get_a_share_prices_historical.md) 并设置
> `adjust=forward|backward`。每次只能传一个 `thscode`。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号。 |
| `from` | string | 否 | — | 事件起始日，格式 `YYYY-MM-DD`。 |
| `to` | string | 否 | — | 事件截止日，格式 `YYYY-MM-DD`。 |

## 调用示例

```text
工具：get_a_share_corporate_actions_adjustment_factors
参数：
  - thscode: "600519.SH"
  - from: "2020-01-01"
  - to: "2026-01-01"
```

## 返回

返回 `{ thscode, ticker, item: [AdjustmentFactorItem, ...] }`，`item` 按 `ex_date_ms` 降序排列。
字段含义见 REST 端点 [复权因子事件流](../../api/a-share/corporate-actions-adjustment-factors.md#响应字段)。

```json
{
  "thscode": "600519.SH",
  "ticker": "600519",
  "item": [
    {
      "ticker": "600519",
      "ex_date_ms": 1766073600000,
      "dividend_per_share": 23.957,
      "per_share_bonus": 0
    },
    {
      "ticker": "600519",
      "ex_date_ms": 1437062400000,
      "dividend_per_share": 4.374,
      "per_share_bonus": 0.1
    }
  ]
}
```

> 注：响应不返回 `event_type` / `record_date` / `adjust_factor`，事件类型由 `dividend_per_share` 与 `per_share_bonus` 两个数值字段隐式区分。
