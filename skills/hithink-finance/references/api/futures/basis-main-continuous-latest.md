# 期货主连最新基差

[业务导航](README.md)

期货基差提供主连合约最新基差快照与指定区间历史数据。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

<a id="basis-main-continuous-latest"></a>
## 期货主连最新基差

```text
GET /api/futures/basis/main-continuous-latest
```

### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/basis/main-continuous-latest' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "item": [
      {
        "thscode": "CU.L8",
        "ticker": "CU",
        "name": "沪铜主连",
        "variety_name": "沪铜",
        "reference_site": null,
        "updated_at": "2026-09-10 15:00:00",
        "spot_publish_date": "2026-09-10",
        "spot_indicator_id": null,
        "spot_price": 78000,
        "converted_spot_price": 78000,
        "close_price": 78200,
        "settle_price": 77900,
        "close_basis": 200,
        "settle_basis": -100,
        "close_basis_rate": 0.0026,
        "settle_basis_rate": -0.0013,
        "default_value": null,
        "average_close_basis": null,
        "average_settle_basis": null
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `thscode` / `ticker` / `name` / `variety_name` | string \| null | 主连代码与名称信息。 |
| `reference_site` / `updated_at` / `spot_publish_date` / `spot_indicator_id` / `default_value` | string \| null | 参考来源、更新时间、现货发布日期、指标 ID 与默认口径原值。 |
| `spot_price` / `converted_spot_price` / `close_price` / `settle_price` | number \| null | 现货、折算现货、收盘与结算价格。 |
| `close_basis` / `settle_basis` / `close_basis_rate` / `settle_basis_rate` | number \| null | 收盘/结算基差及其比例。 |
| `average_close_basis` / `average_settle_basis` | number \| null | 平均收盘与结算基差。 |
