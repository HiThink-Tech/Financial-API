# 标的检索（跨市场消歧）

[业务导航](README.md)

> **info**
> 工具名：`get_meta_tickers_search`
>
> 对应 REST 端点：[`GET /api/meta/tickers/search`](../../api/meta/tickers-search.md)


## 工具描述

> 把公司名、代码片段或别名解析为标准 thscode 代码。当用户用中英文名提及标的，或者
> 你不确定 thscode 是否正确时，**优先调用本工具消歧**；用户已给出完整 thscode（如
> `600519.SH`）时可跳过。返回按相关性排序，最多 50 条。

## 参数

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
| `options` | 期权 |

## 调用示例

```text
工具：get_meta_tickers_search
参数：
  - q: "平安"
  - asset_type: "a-share"
  - limit: 20
```

## 返回

返回 `{ timestamp, item: [TickerItem, ...] }`。字段含义见 REST 端点
[标的检索](../../api/meta/tickers-search.md#响应字段)。

```json
{
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
```

## 为什么是前置工具

LLM 调任何数据工具都需要传 `thscode`，其自身知识对 A 股 6 位代码、交易所后缀、
新上市 / 改名标的容易出错。优先调用本工具消歧，再调下游数据工具。
