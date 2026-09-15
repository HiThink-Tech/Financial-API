# 历史热股排行

[业务导航](README.md)

同花顺热榜提供 A 股热度排名飙升榜、热股榜单、历史热股排行与个股排名走势。
返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

<a id="接口列表"></a>

**接口列表**

| API | 方法与路径 | 说明 |
|---|---|---|
| 飙升榜 | `GET /api/a-share/special-data/skyrocket-list` | 查询 A 股热度排名飙升榜 Top30，支持日榜与小时榜。 |
| A股热股榜单 | `GET /api/a-share/special-data/hot-stock-list` | 查询 A 股热股榜单 Top30，支持 24 小时级别与小时级别。 |
| 历史热股排行 | `GET /api/a-share/special-data/hot-stock-list-history` | 按自然日返回历史热股榜排行。 |
| 个股排名走势 | `GET /api/a-share/special-data/hot-stock-rank-trend` | 查询单只 A 股一段时间内的热榜排名走势。 |

## 历史热股排行

```text
GET /api/a-share/special-data/hot-stock-list-history
```

按自然日返回历史热股榜排行。对外只接受 `date=yyyy-MM-dd`，服务端统一按 `Asia/Shanghai` 当日 00:00 转上游秒级时间戳，避免调用方直接传时间戳导致未对齐自然日。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `date` | query | string | 是 | 目标自然日，格式 `yyyy-MM-dd`；只支持一年内数据。 | - |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/hot-stock-list-history?date=2026-06-21' \
  -H 'X-api-key: <your-api-key>'
```

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

### 约束与错误

- `date` 必须为 `yyyy-MM-dd`，否则返回 `code=1002`。
- `date` 不在一年内时返回 `code=1003`。
