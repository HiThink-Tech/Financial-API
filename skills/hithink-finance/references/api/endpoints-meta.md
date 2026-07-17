# 元信息端点

> 标的检索与代码表获取。参数定义、响应字段以本文档为准。

## 1. 标的检索

```text
GET /api/meta/tickers/search
```

按完整 `thscode`、纯 ticker、中文名或英文名做跨市场检索与消歧。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `q` | query | string | 是 | 检索词，支持 thscode / ticker / 中英文名子串。 | — |
| `exchange` | query | string | 否 | 交易所过滤，枚举 `SH` / `SZ` / `BJ`。 | — |
| `asset_type` | query | string | 否 | 资产类别过滤；支持逗号分隔多个值：`a-share` / `a-share-index` / `forex` / `fund-otc` / `fund-etf` / `fund-lof` / `fund-reits`。 | — |
| `limit` | query | integer | 否 | 返回条数上限，≤ 50。 | `10` |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/meta/tickers/search?q=贵州茅台&limit=5' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`，`item[]` 元素为 `TickerItem`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode，如 `600519.SH`。 |
| `ticker` | string | 纯代码，如 `600519`。 |
| `name` | string | 展示名称。 |
| `exchange` | string | 交易所后缀（`SH` / `SZ` / `BJ`），无后缀指数为 `null`。 |
| `asset_type` | string | 资产类别：A 股、指数、外汇或基金叶子类型。 |
| `currency` | string | 币种代码。 |

### 避错要点

- 看到首条模糊匹配就调用业务端点：先结合 `asset_type`、`exchange` 和名称筛选唯一结果。
- 凭名称猜交易所后缀：必须通过搜索消歧，不要自行拼 `.SH` / `.SZ`。
- 多结果仍可能成立时：把候选的代码、名称和资产类别列出，请用户确认，不要自行选择。
- 查基金时优先传基金 `asset_type`；需要同时搜索 ETF 与 LOF 时传 `fund-etf,fund-lof`，不要传抽象值 `fund`。

---

## 2. 标的列表

```text
GET /api/meta/tickers/list
```

按交易所与资产类别批量获取代码表，支持分页。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `exchange` | query | string | 否 | 交易所过滤，逗号分隔列表。 | `SH,SZ` |
| `asset_type` | query | string | 否 | 资产类别；支持逗号分隔多个值，枚举同检索端点。 | — |
| `limit` | query | integer | 否 | 每页条数，≤ 10000。 | `1000` |
| `offset` | query | integer | 否 | 分页偏移。 | `0` |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/meta/tickers/list?exchange=SH,SZ&asset_type=a-share&limit=1000&offset=0' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`，`item[]` 元素结构与 `tickers/search` 的 `TickerItem` 一致。

### 分页规则

- 终止条件：当前页 `item` 数量小于 `limit`，或返回空页。
- 迭代方式：`offset += limit`，直到终止。
- 完整代码表属于大结果，应写入文件供后续程序读取，只报告文件路径和行数，不要把完整列表写入对话上下文。

### 避错要点

- 一次把完整代码表写入上下文：应落盘，只报告路径和行数。
- 忘记递增 `offset`：每页取完后必须 `offset += limit`。
- 需要多个交易所时：确认逗号分隔值格式，默认仅 `SH,SZ`，不含 `BJ`。
- 需要多个资产类别时：在同一个 `asset_type` 中使用逗号分隔并去重；任一未知或空 token 都会返回 `1003`。
