# 基础数据 MCP 工具

名称、简称和代码消歧；先确认标的，再查询行情或披露数据。

## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

### 标的目录（代码表浏览）（`get_meta_tickers_list`）

**描述**

批量获取代码表，支持按资产类别过滤。采用简单 offset/limit 分页，
调用方循环递增 `offset` 直到 `item.length < limit` 即可取尽。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `asset_type` | enum | 否 | — | 资产类别过滤，支持单值或逗号分隔多值；省略时返回全部类型。 |
| `limit` | integer | 否 | `1000` | 单页条数，最大 `10000`。 |
| `offset` | integer | 否 | `0` | 分页偏移。 |

`asset_type` 枚举含义：

| 值 | 含义 |
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

**响应**

返回 `{ timestamp, item: [TickerItem, ...] }`，结构与 `get_meta_tickers_search` 一致。
字段含义见 [标的列表获取](../api/meta/tickers-list.md#响应字段)。

### 标的检索（跨市场消歧）（`get_meta_tickers_search`）

**描述**

把公司名、代码片段或别名解析为标准 thscode 代码。当用户用中英文名提及标的，或者
你不确定 thscode 是否正确时，**优先调用本工具消歧**；用户已给出完整 thscode（如
`600519.SH`）时可跳过。返回按相关性排序，最多 50 条。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `q` | string | 是 | — | 搜索关键词：完整 thscode、ticker 代码或中英文名称（支持子串匹配）。 |
| `exchange` | enum | 否 | — | 证券或衍生品规范交易所代码。 |
| `asset_type` | enum | 否 | — | 资产类别过滤，支持单值或逗号分隔多值；省略 = 全部。 |
| `limit` | integer | 否 | `10` | 返回上限，最大 `50`。 |

`asset_type` 枚举含义：

| 值 | 含义 |
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

**响应**

返回 `{ timestamp, item: [TickerItem, ...] }`。字段含义见 [标的检索](../api/meta/tickers-search.md#响应字段)。
