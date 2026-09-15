# A股历史热股榜

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_hot_stock_list_history`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/hot-stock-list-history`](../../api/a-share/special-data-hot-stock-list-history.md#历史热股排行)


## 工具描述

> 查询指定自然日的 A 股历史热股榜排行。调用方只需要传 `YYYY-MM-DD` 自然日，
> 服务端按 `Asia/Shanghai` 当日 00:00 转换上游时间戳。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date` | string | 是 | — | 目标自然日，格式 `YYYY-MM-DD`；只支持一年内数据。 |

## 调用示例

```text
工具：get_a_share_special_data_hot_stock_list_history
参数：
  - date: "2026-06-21"
```

## 返回

返回 `{ date, date_ms, item: [HotListHistoryItem, ...] }`。`date` / `date_ms` 是整批榜单日期，
不会在每个 `item` 内重复出现。字段含义见 REST 端点 [历史热股排行](../../api/a-share/special-data-hot-stock-list-history.md#历史热股排行)。

```json
{
  "date": "2026-06-21",
  "date_ms": 1781971200000,
  "item": [
    {
      "thscode": "000725.SZ",
      "ticker": "000725",
      "name": "京东方A",
      "rank": 1
    }
  ]
}
```
