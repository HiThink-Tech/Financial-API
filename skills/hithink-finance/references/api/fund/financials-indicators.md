# 基金财务指标

[业务导航](README.md)

以下接口均使用完整 `thscode` 唯一定位基金，返回统一 `{ timestamp, item[] }` 数据容器，`timestamp` 为接口响应时间戳。

- `thscode` 是基金唯一标识，必须保留市场后缀。未披露字段保持 `null`，不补零。

<a id="通用请求参数"></a>

**通用请求参数**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

## 基金财务指标

```text
GET /api/fund/financials/indicators
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/financials/indicators?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

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
