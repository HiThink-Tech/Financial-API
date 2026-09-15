# 基金利润表

[业务导航](README.md)

以下接口均使用完整 `thscode` 唯一定位基金，返回统一 `{ timestamp, item[] }` 数据容器，`timestamp` 为接口响应时间戳。

- `thscode` 是基金唯一标识，必须保留市场后缀。未披露字段保持 `null`，不补零。

<a id="通用请求参数"></a>

**通用请求参数**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

## 基金利润表

```text
GET /api/fund/financials/income-statements
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/financials/income-statements?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

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
