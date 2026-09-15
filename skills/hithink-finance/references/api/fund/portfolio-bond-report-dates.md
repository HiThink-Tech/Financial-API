# 基金债券持仓报告日期

[业务导航](README.md)

本页接口使用完整 `thscode` 唯一定位基金。历史持仓来自定期披露，不代表实时持仓。

- `thscode` 是基金唯一标识，必须保留市场后缀。持仓来自定期披露，不代表实时持仓。

## 基金债券持仓报告日期

```text
GET /api/fund/portfolio/bond-report-dates
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 否 | — | 报告类型。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/bond-report-dates?thscode=510300.SH&report_type=quarter' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a5eaa47bf5bd4ff5b21e7235bb011123",
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

字段结构与“基金股票持仓报告日期”一致。
