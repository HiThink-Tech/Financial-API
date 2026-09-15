# 期货历史基差

[业务导航](README.md)

期货基差提供主连合约最新基差快照与指定区间历史数据。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

<a id="basis-historical"></a>
## 期货历史基差

```text
GET /api/futures/basis/historical
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `spot_indicator_id` | string | 否 | — | 可选现货指标 ID；省略时使用上游默认口径。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/basis/historical?thscode=CU2601.SHF' \
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
        "date": "2026-09-10",
        "spot_price": 78000,
        "converted_spot_price": 78000,
        "close_price": 78200,
        "settle_price": 77900,
        "close_basis": 200,
        "settle_basis": -100,
        "close_basis_rate": 0.0026,
        "settle_basis_rate": -0.0013
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[].date` | string \| null | 记录日期。 |
| `item[].spot_price` / `converted_spot_price` / `close_price` / `settle_price` | number \| null | 现货、折算现货、收盘与结算价格。 |
| `item[].close_basis` / `settle_basis` / `close_basis_rate` / `settle_basis_rate` | number \| null | 收盘/结算基差及其比例。 |
