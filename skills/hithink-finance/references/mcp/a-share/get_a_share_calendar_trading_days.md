# A股交易日历

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_calendar_trading_days`
>
> 对应 REST 端点：[`GET /api/a-share/calendar/trading-days`](../../api/a-share/calendar-trading-days.md#交易日序列)


## 工具描述

> 获取 A 股近一年交易日序列，固定窗口为 `[今日 - 1 年, 今日]`（Asia/Shanghai 自然日），
> 无任何请求参数。每个交易日同时返回毫秒戳 `date_ms` 与可读日期 `date`（`yyyyMMdd`），
> 按时间升序。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无入参。 |

## 调用示例

```text
工具：get_a_share_calendar_trading_days
参数：（无）
```

## 返回

返回 `{ timestamp, item: [TradingDayItem, ...] }`，按时间升序。
字段含义见 REST 端点 [交易日序列](../../api/a-share/calendar-trading-days.md#响应字段)。

```json
{
  "timestamp": 1748102400000,
  "item": [
    { "date_ms": 1716566400000, "date": "20250525" },
    { "date_ms": 1716652800000, "date": "20250526" },
    { "date_ms": 1716739200000, "date": "20250527" }
  ]
}
```
