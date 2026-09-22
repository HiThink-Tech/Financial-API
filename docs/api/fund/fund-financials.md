# 基金财务数据

[业务导航](README.md)

- [基金财务指标](#financials-indicators)：`GET /api/fund/financials/indicators`
- [基金利润表](#financials-income-statements)：`GET /api/fund/financials/income-statements`
- [基金资产负债表](#financials-balance-sheets)：`GET /api/fund/financials/balance-sheets`

以下接口均使用完整 `thscode` 唯一定位基金，返回统一 `{ timestamp, item[] }` 数据容器，`timestamp` 为接口响应时间戳。

- `thscode` 是基金唯一标识，必须保留市场后缀。未披露字段保持 `null`，不补零。

<a id="financials-indicators--通用请求参数"></a>

**通用请求参数**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

<a id="financials-indicators"></a>
<a id="financials-indicators--基金财务指标"></a>
## 基金财务指标

```text
GET /api/fund/financials/indicators
```

<a id="financials-indicators--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

<a id="financials-indicators--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/financials/indicators?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

<a id="financials-indicators--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "8e6d6e85c99447a2ae89e87b98aa9e7e",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "start_date_ms": 1751328000000,
        "end_date_ms": 1759190400000,
        "publish_date_ms": 1760054400000,
        "distribution_profit": 1250000000.5,
        "current_profit": 1180000000.2,
        "share_nav": 4.753,
        "nav_rate": 3.21
      }
    ]
  }
}
```

<a id="financials-indicators--返回字段"></a>
### 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `start_date_ms` / `end_date_ms` / `publish_date_ms` | long | 报告期起止时间与发布日期。 |
| `distribution_profit` / `current_profit` / `current_income` | number | 可分配利润、本期利润与本期收入。 |
| `distribution_share_profit` | number | 每份可分配利润。 |
| `average_nav_profit_margin` / `average_share_current_profit` | number | 平均净值利润率与平均每份本期利润。 |
| `share_nav` / `sum_share_nav` | number | 单位净值与累计单位净值。 |
| `asset_nav` | number | 基金资产净值。 |
| `sum_nav_rate` / `nav_rate` | number | 累计净值增长率与净值增长率。 |

<a id="financials-income-statements"></a>
<a id="financials-income-statements--通用请求参数"></a>
<a id="financials-income-statements--基金利润表"></a>
## 基金利润表

```text
GET /api/fund/financials/income-statements
```

<a id="financials-income-statements--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

<a id="financials-income-statements--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/financials/income-statements?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

<a id="financials-income-statements--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "5bbd57b24cdd41c9b30f50ca5a57df6c",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "start_date_ms": 1751328000000,
        "end_date_ms": 1759190400000,
        "publish_date_ms": 1760054400000,
        "total_income": 1680000000.2,
        "total_fee": 320000000.4,
        "total_profit": 1360000000.8,
        "net_profit": 1360000000.8
      }
    ]
  }
}
```

<a id="financials-income-statements--返回字段"></a>
### 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `start_date_ms` / `end_date_ms` / `publish_date_ms` | long | 报告期起止时间与发布日期。 |
| `income` / `total_income` | number | 收入与收入合计。 |
| `investment_income` | number | 投资收益。 |
| `stock_investment_income` / `bond_investment_income` / `fund_investment_income` | number | 股票、债券与基金投资收益。 |
| `dividend_income` / `interest_income` | number | 股利与利息收入。 |
| `fair_value_income` / `exchange_income` / `other_income` | number | 公允价值、汇兑及其他收入。 |
| `fee` / `total_fee` | number | 费用与费用合计。 |
| `manager_reward` / `custodian_fee` / `transaction_cost` / `tax_surcharge` | number | 管理人报酬、托管费、交易成本与税费。 |
| `total_profit` / `net_profit` | number | 利润总额与净利润。 |

<a id="financials-balance-sheets"></a>
<a id="financials-balance-sheets--通用请求参数"></a>
<a id="financials-balance-sheets--基金资产负债表"></a>
## 基金资产负债表

```text
GET /api/fund/financials/balance-sheets
```

<a id="financials-balance-sheets--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

<a id="financials-balance-sheets--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/financials/balance-sheets?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

<a id="financials-balance-sheets--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "aaf01838ef4e44eda1a89a8a750f6fb1",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "start_date_ms": 1751328000000,
        "end_date_ms": 1759190400000,
        "publish_date_ms": 1760054400000,
        "total_assets": 168000000000.0,
        "total_liability": 1200000000.0,
        "owner_total_equity": 166800000000.0,
        "liability_and_owner_equity": 168000000000.0
      }
    ]
  }
}
```

<a id="financials-balance-sheets--返回字段"></a>
### 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `start_date_ms` / `end_date_ms` / `publish_date_ms` | long | 报告期起止时间与发布日期。 |
| `total_assets` | number | 资产总计。 |
| `bank_deposit` | number | 银行存款。 |
| `fund_investment` / `stock_investment` / `bond_investment` | number | 基金、股票与债券投资。 |
| `transactional_financial_assets` / `other_assets` | number | 交易性金融资产与其他资产。 |
| `total_liability` / `other_liability` | number | 负债合计与其他负债。 |
| `owner_total_equity` / `undistributed_profit` | number | 所有者权益与未分配利润。 |
| `liability_and_owner_equity` | number | 负债和所有者权益总计。 |

通用鉴权与错误码参见[基金 API 总览](README.md)。
