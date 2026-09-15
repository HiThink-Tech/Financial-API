# A股热股榜单

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

## A股热股榜单

```text
GET /api/a-share/special-data/hot-stock-list
```

查询 A 股热股榜单 Top30。`period=day` 返回 24 小时级别榜单，`period=hour` 返回小时级别榜单；省略 `period` 时默认返回 24 小时级别榜单。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `period` | query | enum | 否 | 榜单周期：`day` 24 小时级别 / `hour` 小时级别。 | `day` |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/hot-stock-list?period=day' \
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

### 响应字段

响应结构与 [飙升榜](special-data-skyrocket-list.md#飙升榜) 一致，`data.item[]` 为 A 股热股榜单股票条目。

### 约束与错误

- `period` 仅接受 `day` / `hour`，否则返回 `code=1002`。
