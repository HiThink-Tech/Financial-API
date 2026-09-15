# 基金行业配置

[业务导航](README.md)

本页接口使用完整 `thscode` 唯一定位基金。历史持仓来自定期披露，不代表实时持仓。

- `thscode` 是基金唯一标识，必须保留市场后缀。持仓来自定期披露，不代表实时持仓。

## 基金行业配置

```text
GET /api/fund/portfolio/industry-allocation
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/industry-allocation?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

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

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `report_period` | string | 报告期。 |
| `industry_name` | string | 行业名称。 |
| `ratio_pct` | number | 行业配置比例，百分数原值。 |

以上接口的 `timestamp` 均为接口响应时间戳。通用参数与错误码参见[基金 API 总览](README.md)。
