# 基金资产配置

[业务导航](README.md)

本页接口使用完整 `thscode` 唯一定位基金。历史持仓来自定期披露，不代表实时持仓。

- `thscode` 是基金唯一标识，必须保留市场后缀。持仓来自定期披露，不代表实时持仓。

## 基金资产配置

```text
GET /api/fund/portfolio/asset-allocation
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/asset-allocation?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

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

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `report_date_ms` | long | 报告日期，毫秒 Unix 时间戳。 |
| `stock_ratio_pct` | number | 股票资产占比，百分数原值。 |
| `bond_ratio_pct` | number | 债券资产占比，百分数原值。 |
| `deposit_ratio_pct` | number | 存款占比，百分数原值。 |
| `other_ratio_pct` | number | 其他资产占比，百分数原值。 |
