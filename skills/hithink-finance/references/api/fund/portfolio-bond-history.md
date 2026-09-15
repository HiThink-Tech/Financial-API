# 基金历史债券持仓

[业务导航](README.md)

本页接口使用完整 `thscode` 唯一定位基金。历史持仓来自定期披露，不代表实时持仓。

- `thscode` 是基金唯一标识，必须保留市场后缀。持仓来自定期披露，不代表实时持仓。

## 基金历史债券持仓

```text
GET /api/fund/portfolio/bond-history
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 是 | — | 报告类型。 |
| `end_date` | string | 是 | — | 报告截止日期，格式 `yyyy-MM-dd`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/bond-history?thscode=510300.SH&report_type=quarter&end_date=2026-06-30' \
  -H 'X-api-key: <your-api-key>'
```

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

### 返回字段

字段结构与“基金历史股票持仓”一致；债券记录的 `asset_type` 为 `bond`。`rank` 仅前十大持仓返回 `1`–`10`，其余持仓返回 `null`。
