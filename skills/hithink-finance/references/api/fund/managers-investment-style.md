# 投资风格

[业务导航](README.md)

基金经理接口使用从基金基本资料中取得的 `manager_id`。

- `manager_id` 是基金经理 ID，可从基金基本资料返回值获取；收益率和占比字段为百分数原值。
- 下方示例于 2026-08-19 使用真实远端响应验证，选用宽基的沪深300ETF华泰柏瑞（`510300.SH`）及其管理人柳军（`H000200384`）；数据与时间戳会随数据源更新而变化。

## 投资风格

```text
GET /api/fund/managers/investment-style
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/investment-style?manager_id=H000200384' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "46fded1c293c473a8b406fafe60d4b6b",
  "data": {
    "timestamp": 1787140798489,
    "item": [
      {
        "representative_fund_thscode": "510300.SH",
        "representative_fund_ticker": "510300",
        "representative_fund_name": "华泰柏瑞沪深300ETF",
        "investment_idea": null,
        "total_fund_scale": null,
        "industry_preferences": [
          {
            "report_tag": "2022",
            "percent": [
              0.07,
              0.26,
              0.11,
              0.27,
              0.05,
              0,
              0.23
            ],
            "total_fund_scale": 23304220274.36
          }
        ]
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `representative_fund_thscode` / `representative_fund_ticker` | string \| null | 代表基金完整代码与纯代码。 |
| `representative_fund_name` | string \| null | 代表基金名称。 |
| `investment_idea` | string \| null | 投资理念。 |
| `total_fund_scale` | number \| null | 管理基金总规模。 |
| `industry_preferences` | array \| object \| null | 行业偏好，保留上游结构；已验证样例返回年度记录数组。 |

关联基金解析失败时对应字段为空，不影响主能力；`data.timestamp` 为接口响应时间戳。
