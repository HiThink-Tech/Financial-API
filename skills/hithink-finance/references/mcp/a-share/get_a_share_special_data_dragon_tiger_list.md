# A股龙虎榜

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_dragon_tiger_list`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/dragon-tiger-list`](../../api/a-share/special-data-dragon-tiger-list.md#龙虎榜榜单)


## 工具描述

> 查询龙虎榜榜单。`board_type` 缺省为 `all`；`all` 为全部榜，`org` 为机构榜，
> `hot_money` 为游资榜。`date` 可选，格式 `YYYY-MM-DD`；缺省由服务端取最新可用日期。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `board_type` | string | 否 | `all` | 榜单类型：`all` 全部 / `org` 机构榜 / `hot_money` 游资榜。 |
| `date` | string | 否 | 最新可用交易日 | 目标交易日，格式 `YYYY-MM-DD`。 |

## 调用示例

```text
工具：get_a_share_special_data_dragon_tiger_list
参数：
  - board_type: "hot_money"
  - date: "2026-07-01"
```

## 返回

返回 `{ timestamp, board_type, trade_date, count, stock_count, stock_items, hot_money_items }`。
字段含义见 REST 端点 [龙虎榜榜单](../../api/a-share/special-data-dragon-tiger-list.md#龙虎榜榜单)。

```json
{
  "timestamp": 1782921600000,
  "board_type": "all",
  "trade_date": "2026-07-01",
  "count": 80,
  "stock_count": 75,
  "stock_items": [
    {
      "thscode": "002407.SZ",
      "ticker": "002407",
      "name": "多氟多",
      "net_value": 1786253128.23,
      "hot_rank": 2,
      "range_days": 3
    }
  ],
  "hot_money_items": []
}
```
