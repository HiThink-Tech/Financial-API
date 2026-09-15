# 基金分红记录

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。

```text
GET /api/fund/corporate-actions/dividends
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/corporate-actions/dividends?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "40ca837351bd497f99348b04ffc5c9af",
  "data": {
    "timestamp": 1786690800000,
    "dividend_count": 1,
    "dividend_total": 0.8,
    "item": [
      {
        "per_ten_cash_before_tax": 0.8,
        "per_ten_cash_after_tax": 0.8,
        "progress": "实施",
        "publish_date_ms": 1764547200000,
        "registration_date_ms": 1765152000000,
        "ex_dividend_date_ms": 1765238400000,
        "payment_date_ms": 1765324800000,
        "reinvestment_date_ms": 1765324800000,
        "profit_base_date_ms": 1764460800000,
        "in_dividend_date_ms": 1765324800000
      }
    ]
  }
}
```

## 返回字段

`data` 元数据：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 接口响应时间戳，毫秒 Unix 时间戳。 |
| `dividend_count` | integer | 返回的分红记录总数。 |
| `dividend_total` | number | 服务端返回的累计分红汇总值；不要与每 10 份现金分红混用。 |

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `per_ten_cash_before_tax` / `per_ten_cash_after_tax` | number | 每 10 份税前/税后现金分红。 |
| `progress` | string | 分红进度。 |
| `publish_date_ms` / `registration_date_ms` / `ex_dividend_date_ms` | long | 公告日、权益登记日与除息日。 |
| `payment_date_ms` / `reinvestment_date_ms` | long | 派息日与红利再投资日。 |
| `profit_base_date_ms` / `in_dividend_date_ms` | long | 收益基准日及分红相关日期。 |

通用参数与错误码参见[基金 API 总览](README.md)。
