# 期货主力合约

[业务导航](README.md) · **端内专用** · [使用说明](../README.md#端内能力说明) · **待上线，当前不可调用**

期货合约扩展资料提供品种板块、主连、主力、次主力和商品指数等客户端内能力

- 期货合约使用完整 `thscode`，品种列表每次最多 5 项；金融数值与日期可为 `null`，合法无数据返回空数组。

<a id="futures-main-contracts"></a>
## 期货主力合约

```text
GET /api/futures/contracts/main-list
```

### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

### 请求示例

以下命令仅展示接口路径与参数格式，当前不可用于外部调用。

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/main-list'
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
        "thscode": "CU2601.SHF",
        "ticker": "CU2601",
        "name": "沪铜2601",
        "variety_code": "CU",
        "variety_name": "沪铜",
        "exchange_code": "SHFE",
        "list_date": "2025-01-01",
        "end_date": "2026-01-15",
        "last_trade_date": "2026-01-15",
        "last_delivery_date": "2026-01-20",
        "margin_rate": 0.12,
        "transaction_fee": null,
        "transaction_fee_rate": null
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 主力合约列表。 |
| `thscode` / `ticker` / `name` / `variety_code` / `variety_name` / `exchange_code` | string \| null | 合约、品种与交易所信息。 |
| `list_date` | string \| null | 合约上市日期。 |
| `end_date` | string \| null | 合约上市结束日期。 |
| `last_trade_date` / `last_delivery_date` | string \| null | 最后交易日与最后交割日。 |
| `margin_rate` / `transaction_fee` / `transaction_fee_rate` | number \| null | 保证金率、手续费与手续费率。 |
