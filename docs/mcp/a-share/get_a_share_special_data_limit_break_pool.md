# A股炸板池

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_limit_break_pool`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/limit-break-pool`](../../api/a-share/limit-up-data.md#special-data-limit-break-pool--炸板股票池)


## 工具描述

> 按交易日分页查询 A 股涨停炸板股票池。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date_ms` | integer | 否 | 当前自然日 | 上海时区零点毫秒时间戳。 |
| `page` | integer | 否 | `1` | 页码，从 `1` 开始。 |
| `size` | integer | 否 | `50` | 每页条数，范围 `1..200`。 |
| `sort_field` | enum | 否 | `price_change_ratio_pct` | `price_change_ratio_pct` / `open_times` / `last_price` / `turnover_ratio_pct` / `turnover`。 |
| `sort_dir` | enum | 否 | `desc` | `asc` / `desc`。 |

## 调用示例

```text
工具：get_a_share_special_data_limit_break_pool
参数：
  - page: 1
  - size: 50
  - sort_field: "open_times"
  - sort_dir: "desc"
```

## 返回

返回 `{ timestamp, pagination, item[] }`；字段见 [炸板股票池](../../api/a-share/limit-up-data.md#special-data-limit-break-pool--炸板股票池)。
