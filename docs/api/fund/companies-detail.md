# 基金公司详情

[业务导航](README.md)

- `company_id` 是基金公司 ID，可从基金基本资料返回值获取，不使用公司名称代替。
- 下方示例于 2026-08-19 使用真实远端响应验证；基金数量、规模和时间戳会随数据源更新而变化。

```text
GET /api/fund/companies/detail
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `company_id` | string | 是 | — | 基金公司 ID，可从基金基本资料的 `company_id` 获取。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/companies/detail?company_id=00089990' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "3193d28e58b1477cb41ff1780d0c627d",
  "data": {
    "timestamp": 1787140798465,
    "item": [
      {
        "company_id": "00089990",
        "company_name": "华泰柏瑞基金管理有限公司",
        "company_type": "基金管理公司",
        "established_date_ms": 1100707200000,
        "fund_count": 356,
        "scale": 621043562116.96
      }
    ]
  }
}
```

## 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `company_id` | string | 基金公司 ID。 |
| `company_name` | string | 基金公司名称。 |
| `company_type` | string | 基金公司类型。 |
| `established_date_ms` | long | 成立日期，毫秒 Unix 时间戳。 |
| `fund_count` | integer | 公司旗下基金数量。 |
| `scale` | number | 公司管理规模。 |

通用鉴权与错误码参见[基金 API 总览](README.md)。
