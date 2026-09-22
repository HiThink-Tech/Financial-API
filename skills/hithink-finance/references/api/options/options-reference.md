# 期权合约基础资料

[业务导航](README.md)

- [期权合约详情](#contracts-detail)：`GET /api/options/contracts/detail`
- [期权合约基础信息列表](#contracts-list)：`GET /api/options/contracts/list`

期权合约基础资料提供单个合约详情与分页合约目录。

- 期权合约使用完整 `thscode`；接口返回统一 `ApiResponse` 信封。
- Unix 时间戳均为毫秒；日期按 `Asia/Shanghai` 解释。金融数值与日期来源缺失时可为 `null`，列表无数据时返回 `[]`。

<a id="contracts-detail--contracts-detail"></a>

<a id="contracts-detail"></a>
<a id="contracts-detail--期权合约详情"></a>
## 期权合约详情

```text
GET /api/options/contracts/detail
```

<a id="contracts-detail--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约完整同花顺代码。 |

<a id="contracts-detail--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/options/contracts/detail?thscode=IO2601-C-4000.CFE' \
  -H 'X-api-key: <your-api-key>'
```

<a id="contracts-detail--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "thscode": "IO2601-C-4000.CFE",
    "ticker": "IO2601-C-4000",
    "display_code": "IO2601-C-4000",
    "name": "沪深300股指期权",
    "variety_code": "IO",
    "pinyin": null,
    "list_date": "2026-01-01",
    "end_date": "2026-01-16",
    "last_trade_date": "2026-01-16",
    "last_delivery_date": "2026-01-16",
    "margin_rate": null,
    "underlying_code": "IF2601",
    "strike_price": 4000,
    "exercise_style": "european",
    "option_type": "call",
    "trade_amount": 100
  }
}
```

<a id="contracts-detail--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间，毫秒时间戳。 |
| `thscode` / `ticker` / `display_code` | string \| null | 完整代码、纯代码与展示代码。 |
| `name` / `variety_code` / `pinyin` | string \| null | 合约名称、品种代码与拼音。 |
| `list_date` | string \| null | 合约上市日期；来源缺失时为 `null`。 |
| `end_date` | string \| null | 合约上市结束日期。 |
| `last_trade_date` / `last_delivery_date` | string \| null | 最后交易日与最后交割日；来源缺失时为 `null`。 |
| `margin_rate` / `strike_price` | number \| null | 保证金率与行权价。 |
| `trade_amount` | number \| null | 合约交易单位数量。 |
| `underlying_code` | string \| null | 上游标的代码，不保证为规范 `thscode`。 |
| `exercise_style` | string \| null | 行权方式：`bermudan`、`american` 或 `european`。 |
| `option_type` | string \| null | 期权方向：`call` 或 `put`。 |

<a id="contracts-list"></a>
<a id="contracts-list--contracts-list"></a>
<a id="contracts-list--期权合约基础信息列表"></a>
## 期权合约基础信息列表

```text
GET /api/options/contracts/list
```

从完整期权目录快照分页获取合约基础信息。

<a id="contracts-list--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `limit` | integer | 否 | `100` | 单页条数，范围 `1-1000`。 |
| `offset` | integer | 否 | `0` | 分页偏移，最小为 `0`。 |

<a id="contracts-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/options/contracts/list?limit=100&offset=0' \
  -H 'X-api-key: <your-api-key>'
```

<a id="contracts-list--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "total": 1,
    "item": [
      {
        "thscode": "IO2601-C-4000.CFE",
        "ticker": "IO2601-C-4000",
        "name": "沪深300股指期权",
        "exchange_code": "CFFEX",
        "variety_code": "IO",
        "list_date": "2026-01-01",
        "end_date": "2026-01-16",
        "last_trade_date": "2026-01-16",
        "last_delivery_date": "2026-01-16"
      }
    ]
  }
}
```

<a id="contracts-list--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间，毫秒时间戳。 |
| `total` | integer | 合约总数。 |
| `item[]` | array | 合约基础信息列表。 |

响应 `data.item[]` 的每项包含 `thscode`、`ticker`、`name`、`exchange_code`、
`variety_code`、`list_date`、`end_date`、`last_trade_date` 与 `last_delivery_date`；
日期和来源缺失字段可为 `null`。
