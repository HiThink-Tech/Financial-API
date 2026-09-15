# 从业经历

[业务导航](README.md)

基金经理接口使用从基金基本资料中取得的 `manager_id`。

- `manager_id` 是基金经理 ID，可从基金基本资料返回值获取；收益率和占比字段为百分数原值。
- 下方示例于 2026-08-19 使用真实远端响应验证，选用宽基的沪深300ETF华泰柏瑞（`510300.SH`）及其管理人柳军（`H000200384`）；数据与时间戳会随数据源更新而变化。

## 从业经历

```text
GET /api/fund/managers/experience
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/experience?manager_id=H000200384' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "4b211e1309d441db9b243cfc30a2556e",
  "data": {
    "timestamp": 1787140798437,
    "item": [
      {
        "awards": null,
        "heavy_assets": {
          "stock": [
            {
              "trade_name": "贵州茅台",
              "trade_code": "600519",
              "market_value": 2403228884.47,
              "scale": 1.92
            }
          ]
        },
        "investment_history": {
          "460300": {
            "code": "460300",
            "name": "华泰柏瑞沪深300ETF联接A",
            "start": "2012-05-29",
            "end": "至今"
          }
        }
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `awards` | array \| object \| null | 获奖经历，保留上游结构；已验证样例返回数组。 |
| `heavy_assets` | object | 代表性重仓资产，保留上游结构。 |
| `investment_history` | object | 投资与从业经历，保留上游结构。 |

`data.timestamp` 为接口响应时间戳。
