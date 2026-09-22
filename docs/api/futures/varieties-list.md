# 期货品种资料

[业务导航](README.md)

期货品种资料提供期货品种目录及交易属性。

- 品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- Unix 时间戳均为毫秒；金融数值来源缺失时可为 `null`，列表无数据时返回 `[]`。

```text
GET /api/futures/varieties/list
```

## 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/varieties/list' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "item": [
      {
        "variety_code": "CU",
        "quote_code": "CU",
        "name": "沪铜",
        "exchange_code": "SHFE",
        "exchange_name": "上海期货交易所",
        "has_night_session": true,
        "margin_rate": 0.12,
        "main_contract_thscode": "CU2601.SHF",
        "trade_amount": 5,
        "price_coefficient": 1,
        "price_unit": "元/吨",
        "trade_unit": "吨/手",
        "tick_size": 10,
        "contract_multiplier": 5,
        "capital_flow": null,
        "long_short_ratio": null,
        "transaction_fee": null,
        "transaction_fee_rate": null,
        "trade_sessions": []
      }
    ]
  }
}
```

## 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间，毫秒时间戳。 |
| `item[]` | array | 品种列表。 |
| `item[].variety_code` / `quote_code` / `name` | string \| null | 品种代码、行情代码与名称。 |
| `item[].exchange_code` / `exchange_name` | string \| null | 交易所代码与名称。 |
| `item[].has_night_session` | boolean \| null | 是否包含夜盘。 |
| `item[].margin_rate` / `capital_flow` / `long_short_ratio` | number \| null | 保证金率、资金流与多空比。 |
| `item[].trade_amount` | number \| null | 品种交易单位数量，单位由 `trade_unit` 字段给出。 |
| `item[].price_coefficient` / `tick_size` / `contract_multiplier` | number \| null | 价格系数、最小变动价位与合约乘数。 |
| `item[].price_unit` / `trade_unit` / `main_contract_thscode` | string \| null | 价格单位、交易单位与主力合约代码。 |
| `item[].transaction_fee` / `transaction_fee_rate` | number \| null | 手续费与手续费率。 |
| `item[].trade_sessions[]` | array | 交易时段；每项含 `start_time`、`end_time`、`session_type`。 |
