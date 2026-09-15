# A股行情快照

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_prices_snapshot`
>
> 对应 REST 端点：[`GET /api/a-share/prices/snapshot`](../../api/a-share/prices-snapshot.md#行情快照)


## 工具描述

> 获取 A 股行情快照。`thscodes` 显式给定时按入参顺序批量取数；省略时遍历完整 A 股代码表
> 并按 `limit`/`offset` 分页。返回每只标的的最新价、涨跌额、涨跌幅、开盘 / 最高 / 最低 / 前收价、成交量、成交额。
> 不返回中文名 `name`，如需展示请配合 `get_meta_tickers_search` / `get_meta_tickers_list`。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 否 | — | 逗号分隔的 thscode 列表，如 `600519.SH,000001.SZ`。给定时忽略 `limit` / `offset`。 |
| `limit` | integer | 否 | `100` | 分页大小，仅在 `thscodes` 省略时生效。 |
| `offset` | integer | 否 | `0` | 分页偏移，仅在 `thscodes` 省略时生效。 |

## 调用示例

```text
工具：get_a_share_prices_snapshot
参数：
  - thscodes: "600519.SH,000001.SZ"
```

## 返回

返回 `{ timestamp, total, item: [PriceSnapshotItem, ...] }`。字段含义见 REST 端点
[行情快照](../../api/a-share/prices-snapshot.md#响应字段)。

```json
{
  "timestamp": 1784275991000,
  "total": 2,
  "item": [
    {
      "thscode": "600519.SH",
      "ticker": "600519",
      "last_price": 1277.8,
      "price_change": 21.8,
      "price_change_ratio_pct": 1.735669,
      "open_price": 1252.08,
      "high_price": 1282,
      "low_price": 1250.21,
      "prev_price": 1256,
      "volume": 3098875,
      "turnover": 3937375200
    }
  ]
}
```
