# 跌停股票池

[业务导航](README.md)

涨跌停与炸板数据提供 A 股涨停、跌停、炸板股票池与连板天梯能力，适合盘面复盘、短线情绪分析和连板梯队观察。
返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

<a id="接口列表"></a>

**接口列表**

| API | 方法与路径 | 说明 |
|---|---|---|
| 涨停股票池 | `GET /api/a-share/special-data/limit-up-pool` | 按交易日返回 A 股涨停 / 连板股票池。 |
| 跌停股票池 | `GET /api/a-share/special-data/limit-down-pool` | 按交易日返回 A 股跌停股票池。 |
| 炸板股票池 | `GET /api/a-share/special-data/limit-break-pool` | 按交易日返回 A 股涨停炸板股票池。 |
| 连板天梯 | `GET /api/a-share/special-data/limit-up-ladder` | 返回近 30 个交易日的连板梯队矩阵。 |

## 跌停股票池

```text
GET /api/a-share/special-data/limit-down-pool
```

按交易日返回 A 股跌停股票池，首次与最后跌停时间统一为上海时区 `HH:mm`。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `date_ms` | query | long | 否 | 交易日的上海时区零点毫秒时间戳。 | 当前自然日 |
| `page` | query | integer | 否 | 页码，从 1 开始。 | `1` |
| `size` | query | integer | 否 | 单页条数，范围 `1..200`。 | `50` |
| `sort_field` | query | enum | 否 | `last_limit_time` / `first_limit_time` / `last_price` / `price_change_ratio_pct` / `turnover_ratio_pct`。 | `last_limit_time` |
| `sort_dir` | query | enum | 否 | `asc` / `desc`。 | `desc` |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-down-pool?page=1&size=50&sort_field=last_limit_time&sort_dir=desc' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "5d0430b287ab4fdc89f3c47cd080aa8e",
  "data": {
    "timestamp": 1786690800000,
    "pagination": {
      "total": 1,
      "pages": 1,
      "size": 50,
      "page": 1
    },
    "item": [
      {
        "thscode": "600000.SH",
        "ticker": "600000",
        "name": "示例股票",
        "last_price": 9.8,
        "price_change_ratio_pct": -10.0,
        "first_limit_time": "09:35",
        "last_limit_time": "14:56",
        "turnover_ratio_pct": 4.2
      }
    ]
  }
}
```

### 响应字段

`data.timestamp` 与 `data.pagination` 的定义同涨停股票池；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` / `ticker` / `name` | string | 标准代码、纯代码与股票简称。 |
| `last_price` | decimal | 最新价。 |
| `price_change_ratio_pct` | decimal | 涨跌幅，百分数原值。 |
| `first_limit_time` / `last_limit_time` | string | 首次与最后跌停时间，上海时区 `HH:mm`。 |
| `turnover_ratio_pct` | decimal | 换手率，百分数原值。 |

### 约束与错误

- `sort_field` 仅接受本接口列出的白名单值，否则返回 `code=1002`。
- `sort_dir` 仅接受 `asc` / `desc`。
- `page < 1` 或 `size` 不在 `1..200` 时返回 `code=1003`。
