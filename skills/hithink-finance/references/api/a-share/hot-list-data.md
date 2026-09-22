# 同花顺热榜

[业务导航](README.md)

- [飙升榜](#special-data-skyrocket-list)：`GET /api/a-share/special-data/skyrocket-list`
- [A股热股榜单](#special-data-hot-stock-list)：`GET /api/a-share/special-data/hot-stock-list`
- [历史热股排行](#special-data-hot-stock-list-history)：`GET /api/a-share/special-data/hot-stock-list-history`
- [个股排名走势](#special-data-hot-stock-rank-trend)：`GET /api/a-share/special-data/hot-stock-rank-trend`

同花顺热榜提供 A 股热度排名飙升榜、热股榜单、历史热股排行与个股排名走势。
返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

<a id="special-data-skyrocket-list--接口列表"></a>

**接口列表**

| API | 方法与路径 | 说明 |
|---|---|---|
| 飙升榜 | `GET /api/a-share/special-data/skyrocket-list` | 查询 A 股热度排名飙升榜 Top30，支持日榜与小时榜。 |
| A股热股榜单 | `GET /api/a-share/special-data/hot-stock-list` | 查询 A 股热股榜单 Top30，支持 24 小时级别与小时级别。 |
| 历史热股排行 | `GET /api/a-share/special-data/hot-stock-list-history` | 按自然日返回历史热股榜排行。 |
| 个股排名走势 | `GET /api/a-share/special-data/hot-stock-rank-trend` | 查询单只 A 股一段时间内的热榜排名走势。 |

<a id="special-data-skyrocket-list"></a>
<a id="special-data-skyrocket-list--飙升榜"></a>
## 飙升榜

```text
GET /api/a-share/special-data/skyrocket-list
```

查询 A 股热度排名飙升榜 Top30。`period=day` 返回日榜，`period=hour` 返回小时榜；省略 `period` 时默认返回日榜。

<a id="special-data-skyrocket-list--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `period` | query | enum | 否 | 榜单周期：`day` 日榜 / `hour` 小时榜。 | `day` |

<a id="special-data-skyrocket-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/skyrocket-list?period=hour' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-skyrocket-list--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
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
}
```

<a id="special-data-skyrocket-list--响应字段"></a>
### 响应字段

`data` 为 `DataPayload<HotListItem>`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 榜单时间戳，毫秒级 Unix 时间戳。 |
| `item` | array | 榜单股票条目，最多 30 条。 |

`item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带交易所后缀的标准代码，例如 `603822.SH`。 |
| `ticker` | string | 6 位股票代码。 |
| `name` | string | 股票简称。 |
| `rank` | integer | 当前排名。 |
| `heat` | string | 热度值，保留上游原始字符串。 |
| `rank_change` | integer \| null | 排名变化，正数表示上升，负数表示下降；上游缺失时为 `null`。 |
| `rank_trend` | string | 排名趋势：`up` / `down` / `flat` / `unknown`。 |

<a id="special-data-skyrocket-list--约束与错误"></a>
### 约束与错误

- `period` 仅接受 `day` / `hour`，否则返回 `code=1002`。

<a id="special-data-hot-stock-list"></a>
<a id="special-data-hot-stock-list--接口列表"></a>
<a id="special-data-hot-stock-list--a股热股榜单"></a>
## A股热股榜单

```text
GET /api/a-share/special-data/hot-stock-list
```

查询 A 股热股榜单 Top30。`period=day` 返回 24 小时级别榜单，`period=hour` 返回小时级别榜单；省略 `period` 时默认返回 24 小时级别榜单。

<a id="special-data-hot-stock-list--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `period` | query | enum | 否 | 榜单周期：`day` 24 小时级别 / `hour` 小时级别。 | `day` |

<a id="special-data-hot-stock-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/hot-stock-list?period=day' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-hot-stock-list--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
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
}
```

<a id="special-data-hot-stock-list--响应字段"></a>
### 响应字段

响应结构与 [飙升榜](#special-data-skyrocket-list--飙升榜) 一致，`data.item[]` 为 A 股热股榜单股票条目。

<a id="special-data-hot-stock-list--约束与错误"></a>
### 约束与错误

- `period` 仅接受 `day` / `hour`，否则返回 `code=1002`。

<a id="special-data-hot-stock-list-history"></a>
<a id="special-data-hot-stock-list-history--接口列表"></a>
<a id="special-data-hot-stock-list-history--历史热股排行"></a>
## 历史热股排行

```text
GET /api/a-share/special-data/hot-stock-list-history
```

按自然日返回历史热股榜排行。对外只接受 `date=yyyy-MM-dd`，服务端统一按 `Asia/Shanghai` 当日 00:00 转上游秒级时间戳，避免调用方直接传时间戳导致未对齐自然日。

<a id="special-data-hot-stock-list-history--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `date` | query | string | 是 | 目标自然日，格式 `yyyy-MM-dd`；只支持一年内数据。 | - |

<a id="special-data-hot-stock-list-history--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/hot-stock-list-history?date=2026-06-21' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-hot-stock-list-history--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
    "date": "2026-06-21",
    "date_ms": 1781971200000,
    "item": [
      {
        "thscode": "000725.SZ",
        "ticker": "000725",
        "name": "京东方A",
        "rank": 1
      }
    ]
  }
}
```

<a id="special-data-hot-stock-list-history--响应字段"></a>
### 响应字段

`data` 为 `DataPayload<HotListHistoryItem>`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date` | string | 查询自然日，格式 `yyyy-MM-dd`。 |
| `date_ms` | long | 查询自然日 `Asia/Shanghai` 00:00 毫秒时间戳。 |
| `item` | array | 历史热股榜股票条目，最多 30 条。 |

`item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带交易所后缀的标准代码，例如 `000725.SZ`。 |
| `ticker` | string | 6 位股票代码。 |
| `name` | string | 股票简称。 |
| `rank` | integer | 当日热榜排名。 |

<a id="special-data-hot-stock-list-history--约束与错误"></a>
### 约束与错误

- `date` 必须为 `yyyy-MM-dd`，否则返回 `code=1002`。
- `date` 不在一年内时返回 `code=1003`。

<a id="special-data-hot-stock-rank-trend"></a>
<a id="special-data-hot-stock-rank-trend--接口列表"></a>
<a id="special-data-hot-stock-rank-trend--个股排名走势"></a>
## 个股排名走势

```text
GET /api/a-share/special-data/hot-stock-rank-trend
```

查询单只 A 股在一段自然日窗口内的热榜排名走势。窗口和日期都限制在一年内，返回点位与上游日线序列对齐。
该接口返回的是走势点位，不做 Top30 截断。

<a id="special-data-hot-stock-rank-trend--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscode` | query | string | 是 | 单只 A 股标的，含交易所后缀，例如 `300034.SZ`。 | - |
| `start_date` | query | string | 是 | 起始自然日，格式 `yyyy-MM-dd`。 | - |
| `end_date` | query | string | 是 | 结束自然日，格式 `yyyy-MM-dd`；需大于等于 `start_date`。 | - |

<a id="special-data-hot-stock-rank-trend--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/hot-stock-rank-trend?thscode=300034.SZ&start_date=2026-06-21&end_date=2026-07-01' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-hot-stock-rank-trend--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
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
}
```

<a id="special-data-hot-stock-rank-trend--响应字段"></a>
### 响应字段

`data` 为 `DataPayload<HotListRankTrendItem>`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 起始自然日 `Asia/Shanghai` 00:00 毫秒时间戳。 |
| `item` | array | 日线排名走势点位。 |

`item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 入参标准代码。 |
| `ticker` | string | 6 位股票代码。 |
| `date` | string | 自然日，格式 `yyyy-MM-dd`。 |
| `date_ms` | long | 该自然日 `Asia/Shanghai` 00:00 毫秒时间戳。 |
| `rank` | integer | 当日热榜排名。 |

<a id="special-data-hot-stock-rank-trend--约束与错误"></a>
### 约束与错误

- `start_date` / `end_date` 必须为 `yyyy-MM-dd`，否则返回 `code=1002`。
- 日期不在一年内，或查询窗口超过一年时返回 `code=1003`。
- `start_date > end_date` 时返回 `code=1004`。
- `thscode` 无法映射到上游代码时返回业务错误。
