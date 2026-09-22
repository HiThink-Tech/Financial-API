# 期货次主力合约

[业务导航](README.md)

期货主力与指数合约提供主连、主力、次主力和商品指数能力。

- 期货合约使用完整 `thscode`，品种列表每次最多 5 项；金融数值与日期可为 `null`，合法无数据返回空数组。

<a id="futures-secondary-main-contracts"></a>
## 期货次主力合约

```text
GET /api/futures/contracts/secondary-main-list
```

### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/secondary-main-list' \
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
    "item": []
  }
}
```

### 返回字段

字段结构与[期货主力合约](contracts-main-list.md#futures-main-contracts)一致；合法无数据返回空数组。
