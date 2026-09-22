# 基金经理数据

[业务导航](README.md)

- [投资风格](#managers-investment-style)：`GET /api/fund/managers/investment-style`
- [基金经理业绩](#managers-performance)：`GET /api/fund/managers/performance`
- [从业经历](#managers-experience)：`GET /api/fund/managers/experience`
- [基金经理详情](#managers-detail)：`GET /api/fund/managers/detail`

基金经理接口使用从基金基本资料中取得的 `manager_id`。

- `manager_id` 是基金经理 ID，可从基金基本资料返回值获取；收益率和占比字段为百分数原值。
- 下方示例于 2026-08-19 使用真实远端响应验证，选用宽基的沪深300ETF华泰柏瑞（`510300.SH`）及其管理人柳军（`H000200384`）；数据与时间戳会随数据源更新而变化。

<a id="managers-investment-style"></a>
<a id="managers-investment-style--投资风格"></a>
## 投资风格

```text
GET /api/fund/managers/investment-style
```

<a id="managers-investment-style--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

<a id="managers-investment-style--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/investment-style?manager_id=H000200384' \
  -H 'X-api-key: <your-api-key>'
```

<a id="managers-investment-style--响应示例"></a>
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

<a id="managers-investment-style--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `representative_fund_thscode` / `representative_fund_ticker` | string \| null | 代表基金完整代码与纯代码。 |
| `representative_fund_name` | string \| null | 代表基金名称。 |
| `investment_idea` | string \| null | 投资理念。 |
| `total_fund_scale` | number \| null | 管理基金总规模。 |
| `industry_preferences` | array \| object \| null | 行业偏好，保留上游结构；已验证样例返回年度记录数组。 |

关联基金解析失败时对应字段为空，不影响主能力；`data.timestamp` 为接口响应时间戳。

<a id="managers-performance"></a>

<a id="managers-performance--基金经理业绩"></a>
## 基金经理业绩

```text
GET /api/fund/managers/performance
```

<a id="managers-performance--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |
| `range` | enum | 是 | — | `month` / `tmonth` / `year` / `nowyear` / `now`。 |

<a id="managers-performance--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/performance?manager_id=H000200384&range=year' \
  -H 'X-api-key: <your-api-key>'
```

<a id="managers-performance--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "89385428873f44a98cc27530b88c01c2",
  "data": {
    "timestamp": 1787140798642,
    "item": [
      {
        "date_ms": 1774281600000,
        "manager_return_pct": 2.2001672,
        "peer_return_pct": 5.75548505,
        "benchmark_return_pct": 4474.72
      }
    ]
  }
}
```

<a id="managers-performance--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | 数据日期，毫秒 Unix 时间戳。 |
| `manager_return_pct` | number | 基金经理收益率，百分数原值。 |
| `peer_return_pct` | number | 同类收益率，百分数原值。 |
| `benchmark_return_pct` | number | 基准收益率，百分数原值。 |

<a id="managers-experience"></a>

<a id="managers-experience--从业经历"></a>
## 从业经历

```text
GET /api/fund/managers/experience
```

<a id="managers-experience--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

<a id="managers-experience--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/experience?manager_id=H000200384' \
  -H 'X-api-key: <your-api-key>'
```

<a id="managers-experience--响应示例"></a>
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

<a id="managers-experience--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `awards` | array \| object \| null | 获奖经历，保留上游结构；已验证样例返回数组。 |
| `heavy_assets` | object | 代表性重仓资产，保留上游结构。 |
| `investment_history` | object | 投资与从业经历，保留上游结构。 |

`data.timestamp` 为接口响应时间戳。

<a id="managers-detail"></a>

<a id="managers-detail--基金经理详情"></a>
## 基金经理详情

```text
GET /api/fund/managers/detail
```

<a id="managers-detail--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

<a id="managers-detail--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/detail?manager_id=H000200384' \
  -H 'X-api-key: <your-api-key>'
```

<a id="managers-detail--响应示例"></a>
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

<a id="managers-detail--返回字段"></a>
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
