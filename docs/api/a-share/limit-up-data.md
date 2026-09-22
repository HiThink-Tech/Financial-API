# 涨跌停与炸板数据

[业务导航](README.md)

- [涨停股票池](#special-data-limit-up-pool)：`GET /api/a-share/special-data/limit-up-pool`
- [跌停股票池](#special-data-limit-down-pool)：`GET /api/a-share/special-data/limit-down-pool`
- [炸板股票池](#special-data-limit-break-pool)：`GET /api/a-share/special-data/limit-break-pool`
- [连板天梯](#special-data-limit-up-ladder)：`GET /api/a-share/special-data/limit-up-ladder`

涨跌停与炸板数据提供 A 股涨停、跌停、炸板股票池与连板天梯能力，适合盘面复盘、短线情绪分析和连板梯队观察。
返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

<a id="special-data-limit-up-pool--接口列表"></a>

**接口列表**

| API | 方法与路径 | 说明 |
|---|---|---|
| 涨停股票池 | `GET /api/a-share/special-data/limit-up-pool` | 按交易日返回 A 股涨停 / 连板股票池。 |
| 跌停股票池 | `GET /api/a-share/special-data/limit-down-pool` | 按交易日返回 A 股跌停股票池。 |
| 炸板股票池 | `GET /api/a-share/special-data/limit-break-pool` | 按交易日返回 A 股涨停炸板股票池。 |
| 连板天梯 | `GET /api/a-share/special-data/limit-up-ladder` | 返回近 30 个交易日的连板梯队矩阵。 |

<a id="special-data-limit-up-pool"></a>
<a id="special-data-limit-up-pool--涨停股票池"></a>
## 涨停股票池

```text
GET /api/a-share/special-data/limit-up-pool
```

按交易日返回 A 股涨停 / 连板股票池，后端固定取全部连板与 `main,chinext,ssestar,north` 四类板块，支持分页与排序。
返回字段聚焦涨停语义（涨停时间、原因、连板天数、封单额等），不含资金流 / 行业 / 分时预览等通用字段。

<a id="special-data-limit-up-pool--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `date_ms` | query | long | 否 | 查询交易日 Unix 毫秒戳（Asia/Shanghai 00:00:00）；省略时回退到服务端当前自然日。 | - |
| `page` | query | integer | 否 | 页码，必须 `>= 1`。 | `1` |
| `size` | query | integer | 否 | 分页大小，取值范围 `1` 到 `200`。 | `50` |
| `sort_field` | query | enum | 否 | 排序字段：`last_price` / `continue_day_cnt` / `seal_money` / `limit_up_time`。 | `last_price` |
| `sort_dir` | query | enum | 否 | 排序方向：`asc` / `desc`。 | `desc` |

<a id="special-data-limit-up-pool--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-up-pool?page=1&size=50&sort_field=limit_up_time&sort_dir=desc' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-limit-up-pool--响应示例"></a>
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

<a id="special-data-limit-up-pool--响应字段"></a>
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

<a id="special-data-limit-up-pool--约束与错误"></a>
### 约束与错误

- `sort_field` 仅接受白名单值，否则返回 `code=1002`。
- `sort_dir` 仅接受 `asc` / `desc`。
- `page < 1` 或 `size` 不在 `1..200` 时返回 `code=1003`。

<a id="special-data-limit-down-pool"></a>
<a id="special-data-limit-down-pool--接口列表"></a>
<a id="special-data-limit-down-pool--跌停股票池"></a>
## 跌停股票池

```text
GET /api/a-share/special-data/limit-down-pool
```

按交易日返回 A 股跌停股票池，首次与最后跌停时间统一为上海时区 `HH:mm`。

<a id="special-data-limit-down-pool--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `date_ms` | query | long | 否 | 交易日的上海时区零点毫秒时间戳。 | 当前自然日 |
| `page` | query | integer | 否 | 页码，从 1 开始。 | `1` |
| `size` | query | integer | 否 | 单页条数，范围 `1..200`。 | `50` |
| `sort_field` | query | enum | 否 | `last_limit_time` / `first_limit_time` / `last_price` / `price_change_ratio_pct` / `turnover_ratio_pct`。 | `last_limit_time` |
| `sort_dir` | query | enum | 否 | `asc` / `desc`。 | `desc` |

<a id="special-data-limit-down-pool--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-down-pool?page=1&size=50&sort_field=last_limit_time&sort_dir=desc' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-limit-down-pool--响应示例"></a>
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

<a id="special-data-limit-down-pool--响应字段"></a>
### 响应字段

`data.timestamp` 与 `data.pagination` 的定义同涨停股票池；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` / `ticker` / `name` | string | 标准代码、纯代码与股票简称。 |
| `last_price` | decimal | 最新价。 |
| `price_change_ratio_pct` | decimal | 涨跌幅，百分数原值。 |
| `first_limit_time` / `last_limit_time` | string | 首次与最后跌停时间，上海时区 `HH:mm`。 |
| `turnover_ratio_pct` | decimal | 换手率，百分数原值。 |

<a id="special-data-limit-down-pool--约束与错误"></a>
### 约束与错误

- `sort_field` 仅接受本接口列出的白名单值，否则返回 `code=1002`。
- `sort_dir` 仅接受 `asc` / `desc`。
- `page < 1` 或 `size` 不在 `1..200` 时返回 `code=1003`。

<a id="special-data-limit-break-pool"></a>
<a id="special-data-limit-break-pool--接口列表"></a>
<a id="special-data-limit-break-pool--炸板股票池"></a>
## 炸板股票池

```text
GET /api/a-share/special-data/limit-break-pool
```

按交易日返回 A 股涨停炸板股票池；接口直接消费炸板集合，不在服务端生成或归因。

<a id="special-data-limit-break-pool--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `date_ms` | query | long | 否 | 交易日的上海时区零点毫秒时间戳。 | 当前自然日 |
| `page` | query | integer | 否 | 页码，从 1 开始。 | `1` |
| `size` | query | integer | 否 | 单页条数，范围 `1..200`。 | `50` |
| `sort_field` | query | enum | 否 | `price_change_ratio_pct` / `open_times` / `last_price` / `turnover_ratio_pct` / `turnover`。 | `price_change_ratio_pct` |
| `sort_dir` | query | enum | 否 | `asc` / `desc`。 | `desc` |

<a id="special-data-limit-break-pool--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-break-pool?page=1&size=50&sort_field=open_times&sort_dir=desc' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-limit-break-pool--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "90015f998b184711bd65152750320b47",
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
        "thscode": "000001.SZ",
        "ticker": "000001",
        "name": "示例股票",
        "last_price": 12.5,
        "price_change_ratio_pct": 7.6,
        "open_times": 3,
        "turnover_ratio_pct": 8.1,
        "turnover": 1250000000
      }
    ]
  }
}
```

<a id="special-data-limit-break-pool--响应字段"></a>
### 响应字段

`data.timestamp` 与 `data.pagination` 的定义同涨停股票池；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` / `ticker` / `name` | string | 标准代码、纯代码与股票简称。 |
| `last_price` | decimal | 最新价。 |
| `price_change_ratio_pct` | decimal | 涨跌幅，百分数原值。 |
| `open_times` | integer | 开板次数。 |
| `turnover_ratio_pct` | decimal | 换手率，百分数原值。 |
| `turnover` | decimal | 成交额。 |

<a id="special-data-limit-break-pool--约束与错误"></a>
### 约束与错误

- `sort_field` 仅接受本接口列出的白名单值，否则返回 `code=1002`。
- `sort_dir` 仅接受 `asc` / `desc`。
- `page < 1` 或 `size` 不在 `1..200` 时返回 `code=1003`。

<a id="special-data-limit-up-ladder"></a>
<a id="special-data-limit-up-ladder--接口列表"></a>
<a id="special-data-limit-up-ladder--连板天梯"></a>
## 连板天梯

```text
GET /api/a-share/special-data/limit-up-ladder
```

返回 A 股近 30 个交易日的连板梯队矩阵（按日期 -> 6 个板 -> 股票列表），用于近期连板分布、次日晋级追踪等分析。
无入参；上游当前固定返回 30 日，每个板位最多 4 只。

<a id="special-data-limit-up-ladder--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| - | - | - | - | 无入参。 | - |

<a id="special-data-limit-up-ladder--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-up-ladder' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-limit-up-ladder--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
    "timestamp": 1748102400000,
    "window": {
      "length": 30,
      "date_list": [
        "20250620",
        "20250619"
      ],
      "board_caps": {
        "two_board": 4,
        "three_board": 4,
        "four_board": 4,
        "five_board": 4,
        "six_board": 4,
        "seven_over": 4
      }
    },
    "item": [
      {
        "date": "20250620",
        "boards": {
          "two_board": [
            {
              "thscode": "603986.SH",
              "ticker": "603986",
              "name": "兆易创新",
              "board_num": 2,
              "seal_nextday": null,
              "sign_level": 1
            }
          ],
          "three_board": [],
          "four_board": [],
          "five_board": [],
          "six_board": [],
          "seven_over": []
        }
      }
    ]
  }
}
```

<a id="special-data-limit-up-ladder--响应字段"></a>
### 响应字段

`data` 为 `LimitUpLadderData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `window` | object | 窗口元信息。 |
| `item` | array | 按交易日组织的连板矩阵。 |

`window` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `length` | integer | 交易日窗口长度。 |
| `date_list` | string[] | 窗口内交易日列表，按后端返回顺序排列。 |
| `board_caps` | object | 每个板位的最大列表长度。 |

`item[].boards` 固定包含 `two_board`、`three_board`、`four_board`、`five_board`、`six_board`、`seven_over` 六个数组；上游缺失的板位会补为 `[]`。

`boards.*[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带交易所后缀的标准代码。 |
| `ticker` | string | 6 位股票代码。 |
| `name` | string | 股票简称。 |
| `board_num` | integer | 连板数。 |
| `seal_nextday` | boolean \| null | 次一交易日是否继续封板；最近交易日没有次日参考，固定为 `null`。 |
| `sign_level` | integer | 上游标记等级。 |
