# A股指数历史K线

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_index_prices_historical`
>
> 对应 REST 端点：[`GET /api/a-share-index/prices/historical`](../../api/index/prices-historical.md#指数历史-k-线)


## 工具描述

> 获取单只指数的历史 K 线数据，覆盖上证交易所指数、深证交易所指数、同花顺板块与同花顺行业指数。
> 每次只能传一个 `thscode`，只支持 `start` / `end` 时间区间模式，窗口最长 10 年。指数没有复权语义，因此不提供 `adjust` 参数。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只指数 thscode，不接受逗号，如 `000001.SH` / `399001.SZ` / `886042.TI` / `881101.TI`。 |
| `interval` | string | 是 | `1d` | K 线周期，当前仅支持 `1d`（日线）。 |
| `start` | long | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒 Unix 时间戳。`end - start` 不超过 10 年。 |

## 调用示例

```text
工具：get_a_share_index_prices_historical
参数：
  - thscode: "000001.SH"
  - interval: "1d"
  - start: 1716105600000
  - end: 1747641600000
```

## 返回

返回 `{ timestamp, adjust, item: [PriceBarItem, ...] }`，其中 `adjust` 固定为 `null`。字段含义见 REST 端点
[指数历史 K 线](../../api/index/prices-historical.md#指数历史-k-线)。

```json
{
  "timestamp": 1747584000000,
  "adjust": null,
  "item": [
    {
      "date_ms": 1716134400000,
      "open_price": 3108.22,
      "high_price": 3125.74,
      "low_price": 3101.15,
      "close_price": 3120.68,
      "volume": 281000000,
      "turnover": 360000000000
    }
  ]
}
```
