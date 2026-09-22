# ETF 历史日线行情

[业务导航](README.md)

> **info**
> 工具名：`get_fund_market_historical`
>
> 对应 REST 端点：[`GET /api/fund/market/historical`](../../api/fund/fund-market.md#market-historical--场内基金历史日线行情)


## 工具描述

> 查询单只 ETF 的前复权历史日线行情。仅支持 `interval=1d`，查询窗口最长 5 个自然年。
> LOF、场外基金和 REITs 返回 `code=3004`。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 ETF thscode，如 `510300.SH`。不接受逗号多值。 |
| `interval` | enum | 否 | `1d` | K 线周期，当前仅支持 `1d`。 |
| `start` | long | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒 Unix 时间戳；必须不早于 `start`，窗口最长 5 个自然年。 |

## 调用示例

```text
工具：get_fund_market_historical
参数：
  - thscode: "510300.SH"
  - interval: "1d"
  - start: 1626364800000
  - end: 1784217600000
```

## 返回

返回 `{ timestamp, thscode, interval, adjust, item: [PriceBarItem, ...] }`，其中
价格字段采用前复权口径；`adjust` 固定为 `null`。字段含义见 REST 端点
[场内基金历史日线行情](../../api/fund/fund-market.md#market-historical--场内基金历史日线行情)。
