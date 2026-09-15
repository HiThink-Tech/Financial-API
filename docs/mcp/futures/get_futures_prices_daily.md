# 期货日K

[业务导航](README.md)

> **info**
> 工具名：`get_futures_prices_daily`
>
> 对应 REST 端点：[`GET /api/futures/prices/daily`](../../api/futures/prices-daily.md#prices-daily)


## 工具描述

> 查询固定 1d 周期的期货日 K。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `start` | integer(int64) | 否 | — | 与 end 成对提供的正毫秒时间戳。 |
| `end` | integer(int64) | 否 | — | 与 start 成对提供且不早于 start。 |

## 调用示例

```text
工具：get_futures_prices_daily
参数：
  - thscode: "CU2601.SHF"
  - start: "1788307200000"
  - end: "1789036800000"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货日K](../../api/futures/prices-daily.md#prices-daily)。
