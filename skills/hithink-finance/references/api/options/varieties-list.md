# 期权品种资料

[业务导航](README.md)

期权品种资料提供期权品种目录及交易属性。

- 接口返回统一 `ApiResponse` 信封；Unix 时间戳均为毫秒。
- 金融数值来源缺失时可为 `null`，列表无数据时返回 `[]`。

```text
GET /api/options/varieties/list
```

## 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/options/varieties/list' \
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
        "variety_code": "IO",
        "name": "沪深300股指期权",
        "exchange_code": "CFFEX",
        "exchange_name": "中国金融期货交易所",
        "has_night_session": false,
        "margin_rate": null,
        "trade_amount": 100,
        "price_coefficient": 1,
        "price_unit": "点",
        "trade_unit": "乘数",
        "tick_size": 0.2,
        "contract_multiplier": 100,
        "transaction_fee": null,
        "exercise_fee": null,
        "settlement_type": "cash",
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
| `item[]` | array | 期权品种列表。 |
| `item[].variety_code` / `name` | string \| null | 品种代码与名称。 |
| `item[].exchange_code` / `exchange_name` | string \| null | 交易所代码与名称。 |
| `item[].has_night_session` | boolean \| null | 是否包含夜盘。 |
| `item[].margin_rate` | number \| null | 保证金率。 |
| `item[].trade_amount` | number \| null | 品种交易单位数量，单位由 `trade_unit` 字段给出。 |
| `item[].price_coefficient` / `tick_size` / `contract_multiplier` | number \| null | 价格系数、最小变动价位与合约乘数。 |
| `item[].price_unit` / `trade_unit` | string \| null | 价格单位与交易单位。 |
| `item[].transaction_fee` / `exercise_fee` | number \| null | 交易手续费与行权手续费。 |
| `item[].settlement_type` | string \| null | 品种交割方式：`physical`-实物交割、`cash`-现金交割。 |
| `item[].trade_sessions[]` | array | 交易时段；每项含 `start_time`、`end_time`、`session_type`。 |
