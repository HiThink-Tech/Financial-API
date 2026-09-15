# 个股排名走势

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

## 个股排名走势

```text
GET /api/a-share/special-data/hot-stock-rank-trend
```

查询单只 A 股在一段自然日窗口内的热榜排名走势。窗口和日期都限制在一年内，返回点位与上游日线序列对齐。
该接口返回的是走势点位，不做 Top30 截断。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscode` | query | string | 是 | 单只 A 股标的，含交易所后缀，例如 `300034.SZ`。 | - |
| `start_date` | query | string | 是 | 起始自然日，格式 `yyyy-MM-dd`。 | - |
| `end_date` | query | string | 是 | 结束自然日，格式 `yyyy-MM-dd`；需大于等于 `start_date`。 | - |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/hot-stock-rank-trend?thscode=300034.SZ&start_date=2026-06-21&end_date=2026-07-01' \
  -H 'X-api-key: <your-api-key>'
```

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

### 约束与错误

- `start_date` / `end_date` 必须为 `yyyy-MM-dd`，否则返回 `code=1002`。
- 日期不在一年内，或查询窗口超过一年时返回 `code=1003`。
- `start_date > end_date` 时返回 `code=1004`。
- `thscode` 无法映射到上游代码时返回业务错误。
