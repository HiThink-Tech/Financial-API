# 基金历史业绩指标

[业务导航](README.md)

> **info**
> 工具名：`get_fund_performance_indicators_historical`
>
> 对应 REST 端点：[`GET /api/fund/performance/indicators-historical`](../../api/fund/performance-indicators-historical.md#基金历史业绩指标)


## 工具描述

> 查询基金净值波动、趋势强弱与估值百分位序列。指标周期固定为 `DAY_1`，响应 `data` 仅包含 `timestamp` 和 `item`，不返回顶层 `thscode` 或 `interval`。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `start` | integer | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | integer | 是 | — | 结束时间，毫秒 Unix 时间戳。 |

`start` 和 `end` 必须同时提供；遗漏任一参数都会导致请求参数校验失败。

## 调用示例

```text
工具：get_fund_performance_indicators_historical
参数：
  - thscode: "510300.SH"
  - start: 1735689600000
  - end: 1767225599000
```

## 返回

返回 `{ timestamp, item[] }`，`timestamp` 保留明确的上游数据时间；固定周期 `DAY_1` 不作为顶层字段返回，也不返回顶层 `thscode` 或 `interval`。字段见 [基金历史业绩指标](../../api/fund/performance-indicators-historical.md#基金历史业绩指标)。
