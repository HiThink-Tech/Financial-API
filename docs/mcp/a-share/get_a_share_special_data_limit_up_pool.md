# A股涨停池

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_limit_up_pool`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/limit-up-pool`](../../api/a-share/special-data-limit-up-pool.md#涨停股票池)


## 工具描述

> 按交易日返回 A 股涨停 / 连板股票池，后端固定取全部连板与 `main,chinext,ssestar,north` 四类板块。
> 返回字段聚焦涨停语义，包括涨停时间、涨停原因、连板天数和封单额。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date_ms` | integer | 否 | — | 查询交易日 Unix 毫秒戳（Asia/Shanghai 00:00:00）；省略时回退到服务端当前自然日。 |
| `page` | integer | 否 | `1` | 页码，必须 `>= 1`。 |
| `size` | integer | 否 | `50` | 分页大小，上限 `200`。 |
| `sort_field` | enum | 否 | `last_price` | 排序字段：`last_price` / `continue_day_cnt` / `seal_money` / `limit_up_time`。 |
| `sort_dir` | enum | 否 | `desc` | 排序方向：`asc` / `desc`。 |

## 调用示例

```text
工具：get_a_share_special_data_limit_up_pool
参数：
  - page: 1
  - size: 50
  - sort_field: "limit_up_time"
  - sort_dir: "desc"
```

## 返回

返回 `{ timestamp, pagination, item: [LimitUpPoolItem, ...] }`。
字段含义见 REST 端点 [涨停股票池](../../api/a-share/special-data-limit-up-pool.md#响应字段)。

```json
{
  "timestamp": 1748102400000,
  "pagination": {
    "total": 126,
    "pages": 3,
    "size": 50,
    "page": 1
  },
  "item": [
    {
      "thscode": "603986.SH",
      "ticker": "603986",
      "name": "兆易创新",
      "is_st": false,
      "is_new": false,
      "last_price": 118.23,
      "price_change_ratio_pct": 10.0008,
      "limit_up_time": "09:34",
      "limit_up_reason": "存储芯片",
      "continue_day_text": "2连板",
      "continue_day_cnt": 2,
      "seal_money": 123456789.12,
      "max_seal_money": 234567890.12
    }
  ]
}
```
