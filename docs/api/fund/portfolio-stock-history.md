# 基金历史股票持仓

[业务导航](README.md)

本页接口使用完整 `thscode` 唯一定位基金。历史持仓来自定期披露，不代表实时持仓。

- `thscode` 是基金唯一标识，必须保留市场后缀。持仓来自定期披露，不代表实时持仓。

## 基金历史股票持仓

```text
GET /api/fund/portfolio/stock-history
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 是 | — | 报告类型。 |
| `end_date` | string | 是 | — | 报告截止日期，格式 `yyyy-MM-dd`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/stock-history?thscode=510300.SH&report_type=quarter&end_date=2026-06-30' \
  -H 'X-api-key: <your-api-key>'
```

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
