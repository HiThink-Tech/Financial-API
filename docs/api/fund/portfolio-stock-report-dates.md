# 基金股票持仓报告日期

[业务导航](README.md)

本页接口使用完整 `thscode` 唯一定位基金。历史持仓来自定期披露，不代表实时持仓。

- `thscode` 是基金唯一标识，必须保留市场后缀。持仓来自定期披露，不代表实时持仓。

## 基金股票持仓报告日期

```text
GET /api/fund/portfolio/stock-report-dates
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 否 | — | 报告类型。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/stock-report-dates?thscode=510300.SH&report_type=quarter' \
  -H 'X-api-key: <your-api-key>'
```

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

### 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `report_type` | string | 报告类型。 |
| `report_type_name` | string | 报告类型中文名称。 |
| `start_date_ms` / `end_date_ms` | long | 报告期起止日期，毫秒 Unix 时间戳。 |
