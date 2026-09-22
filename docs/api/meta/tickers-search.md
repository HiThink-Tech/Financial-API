# 标的检索

[业务导航](README.md)

元信息域的标的检索接口，用于按关键词（thscode / ticker / 中英文名称）跨市场消歧，
返回完整标的信息及可用的上市、到期、最后交易和最后交割日期。
所有接口均返回统一响应信封 `ApiResponse`。

```text
GET /api/meta/tickers/search
```

按关键词（thscode / ticker / 中英文名称）跨市场消歧，支持子串匹配。

## 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `q` | query | string | 是 | 搜索关键词：完整 thscode、ticker 代码或中英文名称（支持子串匹配）。 | - |
| `exchange` | query | string | 否 | 交易所过滤；支持证券交易所与 `CFFEX`、`SHFE`、`INE`、`DCE`、`CZCE`、`GFEX`、`SSE`、`SZSE`。 | - |
| `asset_type` | query | string | 否 | 规范化资产类型，支持单值或逗号分隔多值；完整枚举见下方。 | - |
| `limit` | query | integer | 否 | 返回上限，最大 `50`。 | `10` |

`asset_type` 可选值：`a-share`、`a-share-index`、`fund-otc`、`fund-etf`、
`fund-lof`、`fund-reits`、`forex`、`futures`、`futures-commodity-index`、`options`。传入任一非法值返回 `code=1003`。

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
| `futures-commodity-index` | 期货商品指数合约 |
| `options` | 期权 |

## 请求示例

```bash
# 按名称模糊搜索
curl 'https://fuyao.aicubes.cn/api/meta/tickers/search?q=%E5%B9%B3%E5%AE%89&limit=20' \
  -H 'X-api-key: <your-api-key>'

# 按 thscode 精确解析
curl 'https://fuyao.aicubes.cn/api/meta/tickers/search?q=600519.SH' \
  -H 'X-api-key: <your-api-key>'

# 检索 ETF
curl 'https://fuyao.aicubes.cn/api/meta/tickers/search?q=510300&asset_type=fund-etf' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "c3d4e5f6",
  "data": {
    "timestamp": 1716105600000,
    "item": [
      {
        "thscode": "601318.SH",
        "ticker": "601318",
        "name": "中国平安",
        "exchange": "SH",
        "asset_type": "a-share",
        "currency": "CNY",
        "list_date": "2007-03-01",
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
