# 基金经理详情

[业务导航](README.md)

基金经理接口使用从基金基本资料中取得的 `manager_id`。

- `manager_id` 是基金经理 ID，可从基金基本资料返回值获取；收益率和占比字段为百分数原值。
- 下方示例于 2026-08-19 使用真实远端响应验证，选用宽基的沪深300ETF华泰柏瑞（`510300.SH`）及其管理人柳军（`H000200384`）；数据与时间戳会随数据源更新而变化。

## 基金经理详情

```text
GET /api/fund/managers/detail
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/detail?manager_id=H000200384' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "4d1f41d3e8084e57ae45bd03e3a6a331",
  "data": {
    "timestamp": 1787140798517,
    "item": [
      {
        "manager_id": "H000200384",
        "manager_name": "柳军",
        "sex": "m",
        "degree": null,
        "company_id": "00089990",
        "company_name": "华泰柏瑞基金管理有限公司",
        "photo_url": "https://fund.10jqka.com.cn/photos/20210702,etool_11214328996.jpg",
        "annual_return_pct": 0.05096597,
        "maximum_return_pct": -0.45588366644825656
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `manager_id` / `manager_name` | string | 基金经理 ID 与姓名。 |
| `sex` / `degree` | string \| null | 性别与学历。 |
| `company_id` / `company_name` | string \| null | 所属基金公司 ID 与名称。 |
| `resume` / `photo_url` | string \| null | 履历与头像链接。 |
| `annual_return_pct` / `maximum_return_pct` | number \| null | 年化收益率与最大收益率。 |
| `radar_comparison` | array | 雷达图对比数据。 |

以上接口的 `timestamp` 均为接口响应时间戳。通用错误码参见[基金 API 总览](README.md)。
