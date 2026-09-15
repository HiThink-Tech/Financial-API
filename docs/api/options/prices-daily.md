# 期权日K

[业务导航](README.md)

期权行情提供合约当前或最近交易日的分时行情和历史日 K 数据。

- 期权合约使用完整 `thscode`；接口返回统一 `ApiResponse` 信封。
- Unix 时间戳均为毫秒；日期按 `Asia/Shanghai` 解释。金融数值与日期来源缺失时可为 `null`，列表无数据时返回 `[]`。

<a id="prices-daily"></a>
## 期权日K

```text
GET /api/options/prices/daily
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约完整同花顺代码。 |
| `start` | long | 否 | — | 与 `end` 成对提供的正毫秒时间戳；两者均省略时查询最近 100 根。 |
| `end` | long | 否 | — | 与 `start` 成对提供的正毫秒时间戳，且不早于 `start`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/options/prices/daily?thscode=IO2601-C-4000.CFE' \
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
    "thscode": "IO2601-C-4000.CFE",
    "interval": "1d",
    "item": [
      {
        "timestamp": 1788950400000,
        "open_price": 34.8,
        "high_price": 36.1,
        "low_price": 34.2,
        "close_price": 35.2,
        "volume": 120,
        "turnover": 422400
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间，毫秒时间戳。 |
| `thscode` | string | 期权合约代码。 |
| `interval` | string | 固定为 `1d`。 |
| `item[]` | array | 日 K 列表；每项含可空的 `timestamp`、`open_price`、`high_price`、`low_price`、`close_price`、`volume`、`turnover`。 |
