# A股指数行情快照

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_index_prices_snapshot`
>
> 对应 REST 端点：[`GET /api/a-share-index/prices/snapshot`](../../api/index/prices-snapshot.md#指数行情快照)


## 工具描述

> 按 `thscodes` 批量获取指数最新行情，覆盖上证交易所指数、深证交易所指数、同花顺板块与同花顺行业指数。
> 本工具必须显式传入 `thscodes`，不支持空参数枚举全指数。返回最新价、涨跌额、涨跌幅、开盘 / 最高 / 最低 / 前收价、成交量、成交额。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 是 | — | 逗号分隔的指数 thscode 列表，如 `000001.SH,399001.SZ,886042.TI,881101.TI`。 |
| `limit` | integer | 否 | — | 与 A 股行情快照签名对齐，对本工具无效。 |
| `offset` | integer | 否 | — | 与 A 股行情快照签名对齐，对本工具无效。 |

## 调用示例

```text
工具：get_a_share_index_prices_snapshot
参数：
  - thscodes: "000001.SH,399001.SZ,886042.TI,881101.TI"
```

## 返回

返回 `{ timestamp, total, item: [PriceSnapshotItem, ...] }`。字段含义见 REST 端点
[指数行情快照](../../api/index/prices-snapshot.md#指数行情快照)。

```json
{
  "timestamp": 1784275991000,
  "total": 4,
  "item": [
    {
      "thscode": "000001.SH",
      "ticker": "000001",
      "last_price": 3388.06,
      "price_change": 12.21,
      "price_change_ratio_pct": 0.3617,
      "open_price": 3370.25,
      "high_price": 3392.18,
      "low_price": 3365.4,
      "prev_price": 3375.85,
      "volume": 321000000,
      "turnover": 420000000000
    }
  ]
}
```
