# THS 指数成分股列表

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_index_constituents_ths_stock_list`
>
> 对应 REST 端点：[`GET /api/a-share-index/constituents/ths-stock-list`](../../api/index/a-share-index.md#constituents-ths-stock-list--同花顺指数成分股)


## 工具描述

> 按单个指数 `thscode` 返回当前成分股清单。支持同花顺板块指数（如 `886042.TI`）与
> 标准指数（如沪深 300 `000300.SH` / `399300.SZ`）。不接受逗号，单次只能查一个指数。
> 拿到成分股 `thscode` 列表后，可继续调
> [`get_a_share_prices_snapshot`](../a-share/get_a_share_prices_snapshot.md) 取实时行情，或调
> [`get_a_share_prices_historical`](../a-share/get_a_share_prices_historical.md) 取历史 K 线。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 指数 thscode，形如 `{ticker}.{suffix}`。入参会被 `trim().toUpperCase()` 标准化。**不接受逗号**，单次仅支持一个指数。 |

## 调用示例

```text
工具：get_a_share_index_constituents_ths_stock_list
参数：
  - thscode: "886042.TI"
```

## 返回

返回 `{ timestamp, item: [{ thscode, ticker, name }, ...] }`。字段含义见 REST 端点
[同花顺指数列表和成分股 · 同花顺指数成分股](../../api/index/a-share-index.md#constituents-ths-stock-list--响应字段)。

```json
{
  "timestamp": 1748102400000,
  "item": [
    { "thscode": "600519.SH", "ticker": "600519", "name": "贵州茅台" },
    { "thscode": "000858.SZ", "ticker": "000858", "name": "五粮液" }
  ]
}
```

## 与价格工具的组合

成分股 `thscode` 取出后逗号拼接（必要时分批控制单次请求长度），即可喂给
[`get_a_share_prices_snapshot`](../a-share/get_a_share_prices_snapshot.md) 拿到批量实时行情，
完成「指数 → 成分股 → 行情」完整链路。
