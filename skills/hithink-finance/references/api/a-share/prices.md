# 股票行情数据

[业务导航](README.md)

- [行情快照](#prices-snapshot)：`GET /api/a-share/prices/snapshot`
- [历史 K 线](#prices-historical)：`GET /api/a-share/prices/historical`

价格数据模块，提供 A 股行情快照与历史 K 线序列。
所有接口均返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

- 价格类字段为原始货币计价，A 股恒为 `CNY`。

<a id="prices-snapshot"></a>
<a id="prices-snapshot--行情快照"></a>
## 行情快照

```text
GET /api/a-share/prices/snapshot
```

获取 A 股行情快照。`thscodes` 显式传入（逗号分隔）时按入参顺序批量取数、不分页；
省略时遍历完整 A 股代码表（按 thscode 升序），并按 `limit` / `offset` 分页。

<a id="prices-snapshot--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscodes` | query | string | 否 | 逗号分隔的 thscode 列表，如 `600519.SH,000001.SZ`。给定时忽略分页参数。 | - |
| `limit` | query | integer | 否 | 分页大小，仅在 `thscodes` 省略时生效。 | `100` |
| `offset` | query | integer | 否 | 分页偏移，仅在 `thscodes` 省略时生效。 | `0` |

<a id="prices-snapshot--请求示例"></a>
### 请求示例

```bash
# 批量按 thscodes 取
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?thscodes=600519.SH,000001.SZ' \
  -H 'X-api-key: <your-api-key>'

# 全市场分页
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?limit=100&offset=0' \
  -H 'X-api-key: <your-api-key>'
```

<a id="prices-snapshot--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "7e25804be878464ba420037155f041e6",
  "data": {
    "timestamp": 1784275991000,
    "total": 2,
    "item": [
      {
        "thscode": "600519.SH",
        "ticker": "600519",
        "volume": 3098875,
        "turnover": 3937375200,
        "last_price": 1277.8,
        "price_change": 21.8,
        "price_change_ratio_pct": 1.735669,
        "open_price": 1252.08,
        "high_price": 1282,
        "low_price": 1250.21,
        "prev_price": 1256
      }
    ]
  }
}
```

<a id="prices-snapshot--响应字段"></a>
### 响应字段

`data` 为 `SnapshotData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long \| null | 数据就绪时间（毫秒），为本次快照中最新的上游有效时间；无有效数据时为 `null`。 |
| `total` | int | 全市场代码表总数（用于分页模式估算页数）。 |
| `item` | array | 快照记录列表，单条记录也以数组返回。 |

`item[]` 为 `PriceSnapshotItem`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带交易所后缀的完整 thscode，如 `600519.SH`。 |
| `ticker` | string | 纯代码（无交易所后缀），如 `600519`。 |
| `last_price` | number | 最新成交价（原始货币）。 |
| `price_change` | number | 相对前收盘价的涨跌额（原始货币）。 |
| `price_change_ratio_pct` | number | 涨跌幅，单位为百分比数值（如 `1.74` 表示 +1.74%）。 |
| `open_price` | number | 当日开盘价。 |
| `high_price` | number | 当日最高价。 |
| `low_price` | number | 当日最低价。 |
| `prev_price` | number | 前收盘价。 |
| `volume` | number | 成交量（股）。 |
| `turnover` | number | 成交额（原始货币）。 |

> **note 中文名解析**
> 快照响应不返回标的中文名 `name`。如需展示中文名，请配合 [`/api/meta/tickers/search`](../meta/tickers-search.md) 或 [`/api/meta/tickers/list`](../meta/tickers-list.md) 解析。

<a id="prices-historical"></a>

<a id="prices-historical--历史-k-线"></a>
## 历史 K 线

```text
GET /api/a-share/prices/historical
```

获取单只标的的 A 股历史 K 线序列。接口层强约束：**每次请求仅一个 thscode**，
且 `[start, end]` 窗口跨度不超过 10 年。

<a id="prices-historical--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscode` | query | string | 是 | 单只标的 thscode，**不接受逗号**。多标的请分多次请求。 | - |
| `interval` | query | string | 是 | K 线周期，**当前仅支持** `1d`(日线)。 | `1d` |
| `start` | query | long | 是 | 起始时间，毫秒 Unix 时间戳。缺失返回 `code=1001`。 | - |
| `end` | query | long | 是 | 结束时间，毫秒 Unix 时间戳。`end - start` 超过 10 年返回 `code=1003`。 | - |
| `adjust` | query | string | 否 | 复权方式：`none` / `forward`(前复权) / `backward`(后复权)。 | `forward` |

<a id="prices-historical--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/prices/historical?thscode=600519.SH&interval=1d&start=1716105600000&end=1747641600000&adjust=forward' \
  -H 'X-api-key: <your-api-key>'
```

<a id="prices-historical--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "b9f91af9c77a42d6b8a04738793d2fa2",
  "data": {
    "timestamp": 1747584000000,
    "item": [
      {
        "date_ms": 1716134400000,
        "open_price": 1611.602,
        "high_price": 1626.602,
        "low_price": 1601.722,
        "close_price": 1602.612,
        "volume": 3142572.0,
        "turnover": 5401389334.87
      }
    ]
  }
}
```

<a id="prices-historical--响应字段"></a>
### 响应字段

`data` 为 `HistoricalData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据就绪时间（毫秒），为序列中最新一根 K 线的上游有效时间。 |
| `item` | array | K 线列表。 |

`item[]` 为 `PriceBarItem`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | K 线日期（毫秒）。 |
| `open_price` | number | 开盘价。 |
| `high_price` | number | 最高价。 |
| `low_price` | number | 最低价。 |
| `close_price` | number | 收盘价。 |
| `volume` | number | 成交量（股）。 |
| `turnover` | number | 成交额（原始货币）。 |
