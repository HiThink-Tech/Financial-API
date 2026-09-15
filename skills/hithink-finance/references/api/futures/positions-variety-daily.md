# 期货品种日持仓

[业务导航](README.md)

期货持仓提供品种、公司和合约维度的日持仓与历史持仓数据。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

<a id="positions-variety-daily"></a>
## 期货品种日持仓

```text
GET /api/futures/positions/variety-daily
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `date` | string | 是 | — | 交易日期，格式 `yyyy-MM-dd`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/positions/variety-daily?date=2026-09-10' \
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
        "variety_code": "CU",
        "variety_name": "沪铜",
        "volume": 120000,
        "volume_change": 1000,
        "long_position": 80000,
        "long_position_change": 500,
        "short_position": 76000,
        "short_position_change": -200,
        "net_position": 4000,
        "net_position_change": 700,
        "twenty_day_avg_price": 78000,
        "change_risk": null,
        "main_close_price": 78200,
        "index_close_price": 78100,
        "main_settle_price": 77900,
        "main_change_ratio": 0.012,
        "max_funds": null,
        "capital_flow": null
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 品种日持仓列表。 |
| `date` / `variety_code` / `variety_name` | string \| null | 交易日期（`yyyy-MM-dd`）、品种代码与名称。 |
| `volume` / `volume_change` | number \| null | 成交量及变化。 |
| `long_position` / `long_position_change` / `short_position` / `short_position_change` | number \| null | 多空持仓及变化。 |
| `net_position` / `net_position_change` | number \| null | 净持仓及变化。 |
| `twenty_day_avg_price` / `main_close_price` / `index_close_price` / `main_settle_price` | number \| null | 均价、主力/指数收盘价及主力结算价。 |
| `change_risk` / `main_change_ratio` / `max_funds` / `capital_flow` | number \| null | 风险变化、涨跌幅、最大资金与资金流。 |
