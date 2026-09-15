# 基金前十大持有人

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。占比字段为百分数原值，例如 `8.88` 表示 `8.88%`。

## 基金前十大持有人

```text
GET /api/fund/holders/top
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `limit` | integer | 否 | 服务端默认 | 返回条数，最大为 `10`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/holders/top?thscode=510300.SH&limit=10' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "e4a3af1cf0b14210b98d023297740324",
  "data": {
    "timestamp": 1786690800000,
    "limit": 10,
    "item": [
      {
        "holder_id": "holder-001",
        "holder_code": "H001",
        "holder_name": "示例持有人",
        "holder_type": "institution",
        "rank": 1,
        "hold_share": 125000000,
        "hold_rate_pct": 8.25,
        "report_date_ms": 1785513600000,
        "publish_date_ms": 1786118400000
      }
    ]
  }
}
```

### 返回字段

`data` 元数据：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 接口响应时间戳，毫秒 Unix 时间戳。 |
| `limit` | integer | 服务端实际采用的返回条数上限。 |

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `holder_id` / `holder_code` | string | 持有人 ID 与代码。 |
| `holder_name` | string | 持有人名称。 |
| `holder_type` | string | 持有人类型。 |
| `rank` | integer | 持有排名。 |
| `hold_share` | number | 持有份额。 |
| `hold_rate_pct` | number | 持有比例，百分数原值。 |
| `report_date_ms` / `publish_date_ms` | long | 报告日与发布日期，毫秒 Unix 时间戳。 |

通用参数与错误码参见[基金 API 总览](README.md)。
