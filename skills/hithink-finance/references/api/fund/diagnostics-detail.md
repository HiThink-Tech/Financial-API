# 基金诊断详情

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。

```text
GET /api/fund/diagnostics/detail
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/diagnostics/detail?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "5fbfa0f95b854564bc40dfa027868544",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "thscode": "510300.SH",
        "ticker": "510300",
        "fund_type": "exchange",
        "peer_code": "ETF-INDEX",
        "dimensions": {},
        "peer_dimensions": {},
        "probabilities": {},
        "ranges": {},
        "resilience": {},
        "peer_resilience": {}
      }
    ]
  }
}
```

## 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 完整基金 thscode。 |
| `ticker` | string | 纯基金代码。 |
| `fund_type` | string | 基金类型。 |
| `peer_code` | string | 同类比较分组代码。 |
| `dimensions` / `peer_dimensions` | object | 基金诊断维度及同类对比数据，保留上游结构。 |
| `probabilities` / `ranges` | object | 概率与区间数据，保留上游结构。 |
| `resilience` / `peer_resilience` | object | 基金韧性及同类韧性数据，保留上游结构。 |

通用鉴权与错误码参见[基金 API 总览](README.md)。
