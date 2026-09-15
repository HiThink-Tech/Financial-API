# A股跌停池

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_limit_down_pool`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/limit-down-pool`](../../api/a-share/special-data-limit-down-pool.md#跌停股票池)


## 工具描述

> 按交易日分页查询 A 股跌停股票池。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date_ms` | integer | 否 | 当前自然日 | 上海时区零点毫秒时间戳。 |
| `page` | integer | 否 | `1` | 页码，从 `1` 开始。 |
| `size` | integer | 否 | `50` | 每页条数，范围 `1..200`。 |
| `sort_field` | enum | 否 | `last_limit_time` | `last_limit_time` / `first_limit_time` / `last_price` / `price_change_ratio_pct` / `turnover_ratio_pct`。 |
| `sort_dir` | enum | 否 | `desc` | `asc` / `desc`。 |

## 调用示例

```text
工具：get_a_share_special_data_limit_down_pool
参数：
  - page: 1
  - size: 50
  - sort_field: "last_limit_time"
  - sort_dir: "desc"
```

## 返回

返回 `{ timestamp, pagination, item[] }`；字段见 [跌停股票池](../../api/a-share/special-data-limit-down-pool.md#跌停股票池)。
