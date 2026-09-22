# 基金持仓与资产配置

[业务导航](README.md)

- [基金历史股票持仓](#portfolio-stock-history)：`GET /api/fund/portfolio/stock-history`
- [基金历史债券持仓](#portfolio-bond-history)：`GET /api/fund/portfolio/bond-history`
- [基金股票持仓报告日期](#portfolio-stock-report-dates)：`GET /api/fund/portfolio/stock-report-dates`
- [基金债券持仓报告日期](#portfolio-bond-report-dates)：`GET /api/fund/portfolio/bond-report-dates`
- [基金资产配置](#portfolio-asset-allocation)：`GET /api/fund/portfolio/asset-allocation`
- [基金行业配置](#portfolio-industry-allocation)：`GET /api/fund/portfolio/industry-allocation`

本页接口使用完整 `thscode` 唯一定位基金。历史持仓来自定期披露，不代表实时持仓。

- `thscode` 是基金唯一标识，必须保留市场后缀。持仓来自定期披露，不代表实时持仓。

<a id="portfolio-stock-history"></a>
<a id="portfolio-stock-history--基金历史股票持仓"></a>
## 基金历史股票持仓

```text
GET /api/fund/portfolio/stock-history
```

<a id="portfolio-stock-history--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 是 | — | 报告类型。 |
| `end_date` | string | 是 | — | 报告截止日期，格式 `yyyy-MM-dd`。 |

<a id="portfolio-stock-history--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/stock-history?thscode=510300.SH&report_type=quarter&end_date=2026-06-30' \
  -H 'X-api-key: <your-api-key>'
```

<a id="portfolio-stock-history--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "e9738357ba1b4ec98849276fe5367a19",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "thscode": "600519.SH",
        "ticker": "600519",
        "name": "贵州茅台",
        "asset_type": "stock",
        "hold_ratio": 4.67,
        "market_value": 123456789.12,
        "period_increase_pct": 0.12,
        "rank": 1,
        "report_type": "quarter",
        "end_date_ms": 1782748800000
      }
    ]
  }
}
```

<a id="portfolio-stock-history--返回字段"></a>
### 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` / `ticker` / `name` | string | 持仓标的完整代码、纯代码与名称。 |
| `asset_type` | string | 资产类型，股票持仓为 `stock`。 |
| `hold_ratio` | number | 持仓占比，百分数原值。 |
| `market_value` | number | 持仓市值。 |
| `period_increase_pct` | number | 报告期增减比例，百分数原值。 |
| `rank` | integer \| null | 持仓排名；仅前十大持仓返回 `1`–`10`，其余持仓返回 `null`。 |
| `report_type` | string | 报告类型。 |
| `end_date_ms` | long | 报告截止日期，毫秒 Unix 时间戳。 |

<a id="portfolio-bond-history"></a>

<a id="portfolio-bond-history--基金历史债券持仓"></a>
## 基金历史债券持仓

```text
GET /api/fund/portfolio/bond-history
```

<a id="portfolio-bond-history--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 是 | — | 报告类型。 |
| `end_date` | string | 是 | — | 报告截止日期，格式 `yyyy-MM-dd`。 |

<a id="portfolio-bond-history--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/bond-history?thscode=510300.SH&report_type=quarter&end_date=2026-06-30' \
  -H 'X-api-key: <your-api-key>'
```

<a id="portfolio-bond-history--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "6816bf90628e49388d8e14adaf751bc6",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "thscode": "019547.SH",
        "ticker": "019547",
        "name": "示例国债",
        "asset_type": "bond",
        "hold_ratio": 2.35,
        "market_value": 62500000.0,
        "period_increase_pct": -0.08,
        "rank": 1,
        "report_type": "quarter",
        "end_date_ms": 1782748800000
      }
    ]
  }
}
```

<a id="portfolio-bond-history--返回字段"></a>
### 返回字段

字段结构与“基金历史股票持仓”一致；债券记录的 `asset_type` 为 `bond`。`rank` 仅前十大持仓返回 `1`–`10`，其余持仓返回 `null`。

<a id="portfolio-stock-report-dates"></a>

<a id="portfolio-stock-report-dates--基金股票持仓报告日期"></a>
## 基金股票持仓报告日期

```text
GET /api/fund/portfolio/stock-report-dates
```

<a id="portfolio-stock-report-dates--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 否 | — | 报告类型。 |

<a id="portfolio-stock-report-dates--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/stock-report-dates?thscode=510300.SH&report_type=quarter' \
  -H 'X-api-key: <your-api-key>'
```

<a id="portfolio-stock-report-dates--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "b134e73e088341a791a3194c57b5fb0b",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "report_type": "quarter",
        "report_type_name": "季报",
        "start_date_ms": 1775001600000,
        "end_date_ms": 1782748800000
      }
    ]
  }
}
```

<a id="portfolio-stock-report-dates--返回字段"></a>
### 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `report_type` | string | 报告类型。 |
| `report_type_name` | string | 报告类型中文名称。 |
| `start_date_ms` / `end_date_ms` | long | 报告期起止日期，毫秒 Unix 时间戳。 |

<a id="portfolio-bond-report-dates"></a>

<a id="portfolio-bond-report-dates--基金债券持仓报告日期"></a>
## 基金债券持仓报告日期

```text
GET /api/fund/portfolio/bond-report-dates
```

<a id="portfolio-bond-report-dates--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 否 | — | 报告类型。 |

<a id="portfolio-bond-report-dates--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/bond-report-dates?thscode=510300.SH&report_type=quarter' \
  -H 'X-api-key: <your-api-key>'
```

<a id="portfolio-bond-report-dates--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a5eaa47bf5bd4ff5b21e7235bb011123",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "report_type": "quarter",
        "report_type_name": "季报",
        "start_date_ms": 1775001600000,
        "end_date_ms": 1782748800000
      }
    ]
  }
}
```

<a id="portfolio-bond-report-dates--返回字段"></a>
### 返回字段

字段结构与“基金股票持仓报告日期”一致。

<a id="portfolio-asset-allocation"></a>

<a id="portfolio-asset-allocation--基金资产配置"></a>
## 基金资产配置

```text
GET /api/fund/portfolio/asset-allocation
```

<a id="portfolio-asset-allocation--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

<a id="portfolio-asset-allocation--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/asset-allocation?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

<a id="portfolio-asset-allocation--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "fb4a567d631a4fafbc9ac39f2a4cc264",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "report_date_ms": 1782748800000,
        "stock_ratio_pct": 82.3,
        "bond_ratio_pct": 5.2,
        "deposit_ratio_pct": 8.1,
        "other_ratio_pct": 4.4
      }
    ]
  }
}
```

<a id="portfolio-asset-allocation--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `report_date_ms` | long | 报告日期，毫秒 Unix 时间戳。 |
| `stock_ratio_pct` | number | 股票资产占比，百分数原值。 |
| `bond_ratio_pct` | number | 债券资产占比，百分数原值。 |
| `deposit_ratio_pct` | number | 存款占比，百分数原值。 |
| `other_ratio_pct` | number | 其他资产占比，百分数原值。 |

<a id="portfolio-industry-allocation"></a>

<a id="portfolio-industry-allocation--基金行业配置"></a>
## 基金行业配置

```text
GET /api/fund/portfolio/industry-allocation
```

<a id="portfolio-industry-allocation--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

<a id="portfolio-industry-allocation--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/industry-allocation?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

<a id="portfolio-industry-allocation--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "6999bcf53d024fabbba27486c8a421a4",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "report_period": "2026Q2",
        "industry_name": "金融",
        "ratio_pct": 18.6
      }
    ]
  }
}
```

<a id="portfolio-industry-allocation--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `report_period` | string | 报告期。 |
| `industry_name` | string | 行业名称。 |
| `ratio_pct` | number | 行业配置比例，百分数原值。 |

以上接口的 `timestamp` 均为接口响应时间戳。通用参数与错误码参见[基金 API 总览](README.md)。
