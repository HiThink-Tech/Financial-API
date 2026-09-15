# 标的目录（代码表浏览）

[业务导航](README.md)

> **info**
> 工具名：`get_meta_tickers_list`
>
> 对应 REST 端点：[`GET /api/meta/tickers/list`](../../api/meta/tickers-list.md)


## 工具描述

> 批量获取代码表，支持按资产类别过滤。采用简单 offset/limit 分页，
> 调用方循环递增 `offset` 直到 `item.length < limit` 即可取尽。

## 参数

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
| `options` | 期权 |

## 调用示例

```text
工具：get_meta_tickers_list
参数：
  - asset_type: "a-share"
  - limit: 1000
  - offset: 0
```

## 返回

返回 `{ timestamp, item: [TickerItem, ...] }`，结构与 [`get_meta_tickers_search`](get_meta_tickers_search.md) 一致。
字段含义见 REST 端点 [标的列表获取](../../api/meta/tickers-list.md#响应字段)。

## 分页取尽

```text
offset = 0
loop:
  resp = get_meta_tickers_list(offset=offset, limit=1000)
  consume(resp.item)
  if len(resp.item) < 1000: break
  offset += 1000
```
