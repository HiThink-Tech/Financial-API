# A股热股排名趋势

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_hot_stock_rank_trend`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/hot-stock-rank-trend`](../../api/a-share/hot-list-data.md#special-data-hot-stock-rank-trend--个股排名走势)


## 工具描述

> 查询单只 A 股在指定日期区间内的热股榜排名走势。`thscode` 必填且仅支持单只；
> `start_date` / `end_date` 使用 `YYYY-MM-DD`，查询窗口限制在一年内。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 A 股 thscode，不接受逗号，例如 `300033.SZ`。 |
| `start_date` | string | 是 | — | 起始日期，格式 `YYYY-MM-DD`。 |
| `end_date` | string | 是 | — | 结束日期，格式 `YYYY-MM-DD`。 |

## 调用示例

```text
工具：get_a_share_special_data_hot_stock_rank_trend
参数：
  - thscode: "300034.SZ"
  - start_date: "2026-06-21"
  - end_date: "2026-07-01"
```

## 返回

返回 `{ timestamp, item: [HotListRankTrendItem, ...] }`。字段含义见 REST 端点 [个股排名走势](../../api/a-share/hot-list-data.md#special-data-hot-stock-rank-trend--个股排名走势)。

```json
{
  "timestamp": 1781971200000,
  "item": [
    {
      "thscode": "300034.SZ",
      "ticker": "300034",
      "date": "2026-06-21",
      "date_ms": 1781971200000,
      "rank": 1740
    }
  ]
}
```
