# 商品指数合约列表

[业务导航](README.md)

期货主力与指数合约提供主连、主力、次主力和商品指数能力。

- 期货合约使用完整 `thscode`，品种列表每次最多 5 项；金融数值与日期可为 `null`，合法无数据返回空数组。

<a id="futures-commodity-indexes"></a>
## 商品指数合约列表

```text
GET /api/futures/contracts/commodity-index-list
```

### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/commodity-index-list' \
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
    "item": [
      {
        "thscode": "CUFI.WI",
        "ticker": "CUFI",
        "name": "沪铜指数",
        "list_date": "2010-01-01",
        "end_date": null
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 商品指数合约列表；每项含可空的 `thscode`、`ticker`、`name`、`list_date`、`end_date`。 |
| `item[].end_date` | string \| null | 合约上市结束日期。 |
