# 期货合约基础资料

[业务导航](README.md)

- [期货合约详情](#contracts-detail)：`GET /api/futures/contracts/detail`
- [期货合约基础信息列表](#contracts-list)：`GET /api/futures/contracts/list`

期货合约基础资料提供单个合约详情与分页合约目录。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，列表无数据时返回 `[]`。

<a id="contracts-detail--contracts-detail"></a>

<a id="contracts-detail"></a>
<a id="contracts-detail--期货合约详情"></a>
## 期货合约详情

```text
GET /api/futures/contracts/detail
```

<a id="contracts-detail--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |

<a id="contracts-detail--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/detail?thscode=CU2601.SHF' \
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
    "thscode": "CU2601.SHF",
    "ticker": "CU2601",
    "name": "沪铜2601",
    "variety_code": "CU",
    "variety_name": "沪铜",
    "exchange_code": "SHFE",
    "list_date": "2025-01-01",
    "end_date": "2026-01-15",
    "last_trade_date": "2026-01-15",
    "last_delivery_date": "2026-01-20"
  }
}
```

<a id="contracts-detail--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间，毫秒时间戳。 |
| `thscode` / `ticker` / `name` | string \| null | 完整代码、纯代码与合约名称。 |
| `variety_code` / `variety_name` / `exchange_code` | string \| null | 品种代码、品种名称与交易所代码。 |
| `list_date` | string \| null | 合约上市日期；来源缺失时为 `null`。 |
| `end_date` | string \| null | 合约上市结束日期。 |
| `last_trade_date` / `last_delivery_date` | string \| null | 最后交易日与最后交割日；来源缺失时为 `null`。 |

<a id="contracts-list"></a>
<a id="contracts-list--contracts-list"></a>
<a id="contracts-list--期货合约基础信息列表"></a>
## 期货合约基础信息列表

```text
GET /api/futures/contracts/list
```

从完整期货目录快照分页获取合约基础信息，适合批量同步或按目录筛选前的本地索引。

<a id="contracts-list--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `limit` | integer | 否 | `100` | 单页条数，范围 `1-1000`。 |
| `offset` | integer | 否 | `0` | 分页偏移，最小为 `0`。 |

<a id="contracts-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/list?limit=100&offset=0' \
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
        "thscode": "CU2601.SHF",
        "ticker": "CU2601",
        "name": "沪铜2601",
        "exchange_code": "SHFE",
        "variety_code": "CU",
        "list_date": "2025-01-01",
        "end_date": "2026-01-15",
        "last_trade_date": "2026-01-15",
        "last_delivery_date": "2026-01-20"
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
