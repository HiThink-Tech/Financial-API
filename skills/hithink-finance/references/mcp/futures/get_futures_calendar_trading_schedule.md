# 期货交易日日程

[业务导航](README.md)

> **info**
> 工具名：`get_futures_calendar_trading_schedule`
>
> 对应 REST 端点：[`GET /api/futures/calendar/trading-schedule`](../../api/futures/calendar-trading-schedule.md)


## 工具描述

> 查询指定期货合约在日期范围内的交易日列表及对应交易时间安排。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `start_date` | string(date) | 是 | — | 开始日期。 |
| `end_date` | string(date) | 是 | — | 结束日期。 |

## 调用示例

```text
工具：get_futures_calendar_trading_schedule
参数：
  - thscode: "CU2601.SHF"
  - start_date: "2026-01-09"
  - end_date: "2026-01-09"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货交易日](../../api/futures/calendar-trading-schedule.md)。
