# 期货合约基础信息列表

[业务导航](README.md)

期货合约基础资料提供单个合约详情与分页合约目录。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，列表无数据时返回 `[]`。

<a id="contracts-list"></a>
## 期货合约基础信息列表

```text
GET /api/futures/contracts/list
```

从完整期货目录快照分页获取合约基础信息，适合批量同步或按目录筛选前的本地索引。

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `limit` | integer | 否 | `100` | 单页条数，范围 `1-1000`。 |
| `offset` | integer | 否 | `0` | 分页偏移，最小为 `0`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/list?limit=100&offset=0' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "total": 1,
    "item": [
      {
        "thscode": "CU2601.SHF",
        "ticker": "CU2601",
        "name": "沪铜2601",
        "exchange_code": "SHFE",
        "variety_code": "CU",
        "list_date": "2025-01-01",
        "end_date": "2026-01-15",
        "last_trade_date": "2026-01-15",
        "last_delivery_date": "2026-01-20"
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间，毫秒时间戳。 |
| `total` | integer | 合约总数。 |
| `item[]` | array | 合约基础信息列表。 |

响应 `data.item[]` 的每项包含 `thscode`、`ticker`、`name`、`exchange_code`、
`variety_code`、`list_date`、`end_date`、`last_trade_date` 与 `last_delivery_date`；
日期和来源缺失字段可为 `null`。
