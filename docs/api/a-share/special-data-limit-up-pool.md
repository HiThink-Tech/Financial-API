# 涨停股票池

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

## 涨停股票池

```text
GET /api/a-share/special-data/limit-up-pool
```

按交易日返回 A 股涨停 / 连板股票池，后端固定取全部连板与 `main,chinext,ssestar,north` 四类板块，支持分页与排序。
返回字段聚焦涨停语义（涨停时间、原因、连板天数、封单额等），不含资金流 / 行业 / 分时预览等通用字段。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `date_ms` | query | long | 否 | 查询交易日 Unix 毫秒戳（Asia/Shanghai 00:00:00）；省略时回退到服务端当前自然日。 | - |
| `page` | query | integer | 否 | 页码，必须 `>= 1`。 | `1` |
| `size` | query | integer | 否 | 分页大小，取值范围 `1` 到 `200`。 | `50` |
| `sort_field` | query | enum | 否 | 排序字段：`last_price` / `continue_day_cnt` / `seal_money` / `limit_up_time`。 | `last_price` |
| `sort_dir` | query | enum | 否 | 排序方向：`asc` / `desc`。 | `desc` |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-up-pool?page=1&size=50&sort_field=limit_up_time&sort_dir=desc' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
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
}
```

### 响应字段

`data` 为 `LimitUpPoolData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `pagination` | object | 分页信息。 |
| `item` | array | 涨停股票列表。 |

`pagination` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `total` | integer | 总条数。 |
| `pages` | integer | 总页数。 |
| `size` | integer | 当前分页大小，回显请求参数。 |
| `page` | integer | 当前页码，回显请求参数。 |

`item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带交易所后缀的标准代码，例如 `603986.SH`。 |
| `ticker` | string | 6 位股票代码。 |
| `name` | string | 股票简称。 |
| `is_st` | boolean | 是否 ST，仅展示，不作为筛选入参。 |
| `is_new` | boolean | 是否未开板新股，仅展示。 |
| `last_price` | decimal | 当前价格，单位元。 |
| `price_change_ratio_pct` | decimal | 涨跌幅百分比，已乘以 100。 |
| `limit_up_time` | string | 涨停时间，格式 `HH:MM`。 |
| `limit_up_reason` | string \| null | 涨停原因；上游空字符串会标准化为 `null`。 |
| `continue_day_text` | string | 连板文本，例如 `首板`、`5天4板`。 |
| `continue_day_cnt` | integer | 连板计数。 |
| `seal_money` | decimal | 当前封单额，单位元。 |
| `max_seal_money` | decimal | 峰值封单额，单位元。 |

### 约束与错误

- `sort_field` 仅接受白名单值，否则返回 `code=1002`。
- `sort_dir` 仅接受 `asc` / `desc`。
- `page < 1` 或 `size` 不在 `1..200` 时返回 `code=1003`。
