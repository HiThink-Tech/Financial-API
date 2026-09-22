# 期权K线

[业务导航](README.md)

> **info**
> 工具名：`get_options_prices_daily`
>
> 对应 REST 端点：[`GET /api/options/prices/daily`](../../api/options/options-prices.md#prices-daily--prices-daily)


## 工具描述

> 查询期权 K 线；端外仅允许 `day_1`，AI 客户端内可使用完整周期集合。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约完整同花顺代码。 |
| `start` | integer(int64) | 否 | — | 与 end 成对提供的正毫秒时间戳。 |
| `end` | integer(int64) | 否 | — | 与 start 成对提供且不早于 start。 |
| `time_period` | enum | 否 | — | 端外仅允许 `day_1`；AI 客户端内支持 `min_1`、`min_10`、`hour_1`、`day_1`、`week_1`、`month_1`、`quarter_1`、`year_1`。 |

## 调用示例

```text
工具：get_options_prices_daily
参数：
  - thscode: "IO2601-C-4000.CFE"
  - start: "1788307200000"
  - end: "1789036800000"
  - time_period: "day_1"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期权日K](../../api/options/options-prices.md#prices-daily--prices-daily)。
