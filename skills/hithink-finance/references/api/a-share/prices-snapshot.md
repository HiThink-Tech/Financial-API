# 行情快照

[业务导航](README.md)

价格数据模块，提供 A 股行情快照与历史 K 线序列。
所有接口均返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

- 价格类字段为原始货币计价，A 股恒为 `CNY`。

## 行情快照

```text
GET /api/a-share/prices/snapshot
```

获取 A 股行情快照。`thscodes` 显式传入（逗号分隔）时按入参顺序批量取数、不分页；
省略时遍历完整 A 股代码表（按 thscode 升序），并按 `limit` / `offset` 分页。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscodes` | query | string | 否 | 逗号分隔的 thscode 列表，如 `600519.SH,000001.SZ`。给定时忽略分页参数。 | - |
| `limit` | query | integer | 否 | 分页大小，仅在 `thscodes` 省略时生效。 | `100` |
| `offset` | query | integer | 否 | 分页偏移，仅在 `thscodes` 省略时生效。 | `0` |

### 请求示例

```bash
# 批量按 thscodes 取
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?thscodes=600519.SH,000001.SZ' \
  -H 'X-api-key: <your-api-key>'

# 全市场分页
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?limit=100&offset=0' \
  -H 'X-api-key: <your-api-key>'
```

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
