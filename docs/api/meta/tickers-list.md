# 标的列表获取

[业务导航](README.md)

元信息域的标的列表获取接口，用于批量获取代码表，支持按资产类型过滤。
响应是完整标的信息及可用的上市、到期、最后交易和最后交割日期，
所有接口均返回统一响应信封 `ApiResponse`。

```text
GET /api/meta/tickers/list
```

批量获取代码表，支持按资产类型过滤。采用 offset / limit 分页，
调用方循环递增 `offset` 直到 `item.length < limit` 即可取尽。

## 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `asset_type` | query | string | 否 | 规范化资产类型，支持单值或逗号分隔多值；省略时返回全部类型。 | 全部类型 |
| `limit` | query | integer | 否 | 单页条数，最大 `10000`。 | `1000` |
| `offset` | query | integer | 否 | 分页偏移。 | `0` |

`asset_type` 可选值：`a-share`、`a-share-index`、`fund-otc`、`fund-etf`、
`fund-lof`、`fund-reits`、`forex`、`futures`、`options`。传入任一非法值返回 `code=1003`。

| `asset_type` | 含义 |
|---|---|
| `a-share` | A 股股票 |
| `a-share-index` | A 股指数、同花顺指数或板块 |
| `fund-otc` | 场外公募基金 |
| `fund-etf` | ETF 基金 |
| `fund-lof` | LOF 基金 |
| `fund-reits` | 公募 REITs |
| `forex` | 外汇 |
| `futures` | 期货 |
| `options` | 期权 |

## 请求示例

```bash
# 拉取全部 A 股
curl 'https://fuyao.aicubes.cn/api/meta/tickers/list?asset_type=a-share&limit=1000&offset=0' \
  -H 'X-api-key: <your-api-key>'

# 拉取 A 股指数
curl 'https://fuyao.aicubes.cn/api/meta/tickers/list?asset_type=a-share-index&limit=500' \
  -H 'X-api-key: <your-api-key>'

# 同时拉取 ETF 与 LOF
curl 'https://fuyao.aicubes.cn/api/meta/tickers/list?asset_type=fund-etf,fund-lof&limit=1000&offset=0' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "f7g8h9i0",
  "data": {
    "timestamp": 1716105600000,
    "item": [
      {
        "thscode": "600519.SH",
        "ticker": "600519",
        "name": "贵州茅台",
        "exchange": "SH",
        "asset_type": "a-share",
        "currency": "CNY",
        "list_date": "2001-08-27",
        "end_date": null,
        "last_trade_date": null,
        "last_delivery_date": null
      }
    ]
  }
}
```

## 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据就绪时间（毫秒），为当前代码表快照的上游加载时间。 |
| `item` | array | 标的列表。 |

`item[]` 为 `TickerItem`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 完整 thscode，如 `600519.SH`。 |
| `ticker` | string | 纯代码，如 `600519`。 |
| `name` | string | 展示名称。 |
| `exchange` | string \| null | 交易所后缀（`SH` / `SZ` / `BJ`）；场外基金为 `null`，`.OF` 不是交易所。 |
| `asset_type` | string | 规范化资产类型；每条记录仅返回一个叶子类型，含义同请求参数枚举表。 |
| `currency` | string | 币种代码；当前基金统一为 `CNY`。 |
| `list_date` | string \| null | 上市日期，格式 `yyyy-MM-dd`。 |
| `end_date` | string \| null | 合约到期日，格式 `yyyy-MM-dd`。 |
| `last_trade_date` | string \| null | 最后交易日，格式 `yyyy-MM-dd`。 |
| `last_delivery_date` | string \| null | 最后交割日，格式 `yyyy-MM-dd`。 |
