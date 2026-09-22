# 期货K线

[业务导航](README.md)

> **info**
> 工具名：`get_futures_prices_daily`
>
> 对应 REST 端点：[`GET /api/futures/prices/daily`](../../api/futures/futures-prices.md#prices-daily--prices-daily)


## 工具描述

> 查询期货 K 线；端外仅允许 `day_1`，AI 客户端内可使用完整周期集合。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约或期货商品指数完整同花顺代码，例如 `CU2601.SHF`、`850002.TI`。 |
| `start` | integer(int64) | 否 | — | 与 end 成对提供的正毫秒时间戳。 |
| `end` | integer(int64) | 否 | — | 与 start 成对提供且不早于 start。 |
| `time_period` | enum | 否 | — | 端外仅允许 `day_1`；AI 客户端内支持 `min_1`、`min_10`、`hour_1`、`day_1`、`week_1`、`month_1`、`quarter_1`、`year_1`。 |

## 调用示例

```text
工具：get_futures_prices_daily
参数：
  - thscode: "CU2601.SHF"
  - start: "1788307200000"
  - end: "1789036800000"
  - time_period: "day_1"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货日K](../../api/futures/futures-prices.md#prices-daily--prices-daily)。
