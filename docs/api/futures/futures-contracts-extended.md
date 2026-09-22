# 期货主力与指数合约

[业务导航](README.md)

- [期货主连资料](#contracts-main-continuous-list)：`GET /api/futures/contracts/main-continuous-list`
- [期货主力合约](#contracts-main-list)：`GET /api/futures/contracts/main-list`
- [期货次主力合约](#contracts-secondary-main-list)：`GET /api/futures/contracts/secondary-main-list`
- [商品指数合约列表](#contracts-commodity-index-list)：`GET /api/futures/contracts/commodity-index-list`

期货主力与指数合约提供主连、主力、次主力和商品指数能力。

- 期货合约使用完整 `thscode`，品种列表每次最多 5 项；金融数值与日期可为 `null`，合法无数据返回空数组。

<a id="contracts-main-continuous-list--futures-main-continuous"></a>

<a id="contracts-main-continuous-list"></a>
<a id="contracts-main-continuous-list--期货主连资料"></a>
## 期货主连资料

```text
GET /api/futures/contracts/main-continuous-list
```

<a id="contracts-main-continuous-list--请求参数"></a>
### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

<a id="contracts-main-continuous-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/main-continuous-list' \
  -H 'X-api-key: <your-api-key>'
```

<a id="contracts-main-continuous-list--响应示例"></a>
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
        "variety_code": "CU",
        "variety_name": "沪铜",
        "exchange_code": "SHFE",
        "minute_visit_count": 1200,
        "kline_visit_count": 300,
        "statistics_date": "2026-09-10"
      }
    ]
  }
}
```

<a id="contracts-main-continuous-list--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 主连列表。 |
| `thscode` / `ticker` / `name` / `variety_code` / `variety_name` / `exchange_code` | string \| null | 主连代码、名称、品种与交易所信息。 |
| `minute_visit_count` / `kline_visit_count` | integer \| null | 分时与 K 线访问次数。 |
| `statistics_date` | string \| null | 统计日期。 |

<a id="contracts-main-list"></a>
<a id="contracts-main-list--futures-main-contracts"></a>
<a id="contracts-main-list--期货主力合约"></a>
## 期货主力合约

```text
GET /api/futures/contracts/main-list
```

<a id="contracts-main-list--请求参数"></a>
### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

<a id="contracts-main-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/main-list' \
  -H 'X-api-key: <your-api-key>'
```

<a id="contracts-main-list--响应示例"></a>
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

<a id="contracts-main-list--返回字段"></a>
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

<a id="contracts-secondary-main-list"></a>
<a id="contracts-secondary-main-list--futures-secondary-main-contracts"></a>
<a id="contracts-secondary-main-list--期货次主力合约"></a>
## 期货次主力合约

```text
GET /api/futures/contracts/secondary-main-list
```

<a id="contracts-secondary-main-list--请求参数"></a>
### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

<a id="contracts-secondary-main-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/secondary-main-list' \
  -H 'X-api-key: <your-api-key>'
```

<a id="contracts-secondary-main-list--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "item": []
  }
}
```

<a id="contracts-secondary-main-list--返回字段"></a>
### 返回字段

字段结构与[期货主力合约](#contracts-main-list--futures-main-contracts)一致；合法无数据返回空数组。

<a id="contracts-commodity-index-list"></a>
<a id="contracts-commodity-index-list--futures-commodity-indexes"></a>
<a id="contracts-commodity-index-list--商品指数合约列表"></a>
## 商品指数合约列表

```text
GET /api/futures/contracts/commodity-index-list
```

<a id="contracts-commodity-index-list--请求参数"></a>
### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

<a id="contracts-commodity-index-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/commodity-index-list' \
  -H 'X-api-key: <your-api-key>'
```

<a id="contracts-commodity-index-list--响应示例"></a>
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
        "thscode": "CUFI.WI",
        "ticker": "CUFI",
        "name": "沪铜指数",
        "list_date": "2010-01-01",
        "end_date": null
      }
    ]
  }
}
```

<a id="contracts-commodity-index-list--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 商品指数合约列表；每项含可空的 `thscode`、`ticker`、`name`、`list_date`、`end_date`。 |
| `item[].end_date` | string \| null | 合约上市结束日期。 |
