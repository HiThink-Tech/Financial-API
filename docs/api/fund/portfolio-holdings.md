# 基金重仓持仓

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。持仓来自定期披露，不代表实时持仓。

```text
GET /api/fund/portfolio/holdings
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀，如 `025480.OF`。 |

持仓来自定期披露，不代表实时持仓。返回可同时包含股票、债券和基金资产。

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/holdings?thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "0045aff2514c4e098212db69f88a5fa5",
  "data": {
    "timestamp": 0,
    "item": [
      {
        "thscode": "300750.SZ",
        "ticker": "300750",
        "stock_name": "宁德时代",
        "hold_ratio": 4.67,
        "asset_type": "stock",
        "position_capital": 123456789.12,
        "position_count": 1234567,
        "security_market_value_rate_pct": 4.67,
        "period_increase_rate_pct": 0.12,
        "investment_rank": 1,
        "end_date_ms": 1785513600000
      }
    ],
    "total_stock_ratio_pct": 82.3,
    "total_bond_ratio_pct": 5.2,
    "total_fund_ratio_pct": 0,
    "turnover_rate_pct": 96.4,
    "stock_ratio_pct": 82.3,
    "main_industry": "电子",
    "concentration_ratio": 48.6
  }
}
```

## 返回字段

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 持仓股票的完整 thscode。 |
| `ticker` | string | 持仓股票的纯代码。 |
| `stock_name` | string | 资产名称；字段名为兼容既有契约而保留。 |
| `hold_ratio` | number | 占基金净值比例的百分数原值。 |
| `asset_type` | string | 资产类型，如 `stock` / `bond` / `fund`。 |
| `position_capital` / `position_count` | number | 持仓市值与持仓数量。 |
| `security_market_value_rate_pct` / `period_increase_rate_pct` | number | 证券市值占比与报告期增减比例。 |
| `investment_rank` | integer | 持仓排名。 |
| `start_date_ms` / `end_date_ms` / `publish_date_ms` / `modify_time_ms` | long | 报告期、发布日期与修改时间。 |

`data` 还可能包含 `total_stock_ratio_pct`、`total_bond_ratio_pct`、`total_fund_ratio_pct`、`turnover_rate_pct`、`stock_ratio_pct`、`main_industry` 与 `concentration_ratio` 等持仓汇总字段。

通用参数与错误码参见[基金 API 总览](README.md)。
