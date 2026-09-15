# 基金资产负债表

[业务导航](README.md)

以下接口均使用完整 `thscode` 唯一定位基金，返回统一 `{ timestamp, item[] }` 数据容器，`timestamp` 为接口响应时间戳。

- `thscode` 是基金唯一标识，必须保留市场后缀。未披露字段保持 `null`，不补零。

<a id="通用请求参数"></a>

**通用请求参数**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

## 基金资产负债表

```text
GET /api/fund/financials/balance-sheets
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/financials/balance-sheets?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

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
