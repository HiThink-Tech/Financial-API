# A股热股榜

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_hot_stock_list`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/hot-stock-list`](../../api/a-share/hot-list-data.md#special-data-hot-stock-list--a股热股榜单)


## 工具描述

> 返回 A 股热股榜单。`period` 缺省为 `day`；`day` 表示 24 小时榜，`hour` 表示小时榜。
> 响应包含排名、热度、排名变化、涨跌停分析和标签信息。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `period` | string | 否 | `day` | 榜单周期：`day` 24 小时榜 / `hour` 小时榜。 |

## 调用示例

```text
工具：get_a_share_special_data_hot_stock_list
参数：
  - period: "day"
```

## 返回

返回 `{ timestamp, item: [HotListItem, ...] }`。字段含义见 REST 端点 [A股热股榜单](../../api/a-share/hot-list-data.md#special-data-hot-stock-list--a股热股榜单)。

```json
{
  "timestamp": 1748102400000,
  "item": [
    {
      "thscode": "603822.SH",
      "ticker": "603822",
      "name": "嘉澳环保",
      "rank": 1,
      "heat": "1941909",
      "rank_change": 7,
      "rank_trend": "up"
    }
  ]
}
```
