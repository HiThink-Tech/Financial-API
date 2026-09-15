# A股飙升榜

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_skyrocket_list`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/skyrocket-list`](../../api/a-share/special-data-skyrocket-list.md#飙升榜)


## 工具描述

> 返回 A 股飙升热榜。`period` 缺省为 `day`；`day` 表示日榜，`hour` 表示小时榜。
> 响应按热榜排名正序返回，包含排名、热度、排名变化和排名趋势。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `period` | string | 否 | `day` | 榜单周期：`day` 日榜 / `hour` 小时榜。 |

## 调用示例

```text
工具：get_a_share_special_data_skyrocket_list
参数：
  - period: "hour"
```

## 返回

返回 `{ timestamp, item: [HotListItem, ...] }`。字段含义见 REST 端点 [飙升榜](../../api/a-share/special-data-skyrocket-list.md#飙升榜)。

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
