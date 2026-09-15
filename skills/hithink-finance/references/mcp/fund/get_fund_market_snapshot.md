# 基金行情快照

[业务导航](README.md)

> **info**
> 工具名：`get_fund_market_snapshot`
>
> 对应 REST 端点：[`GET /api/fund/market/snapshot`](../../api/fund/market-snapshot.md#场内基金行情快照)


## 工具描述

> 查询场内基金行情快照，当前仅支持 ETF。工具使用完整 `thscode` 唯一定位基金。
> LOF、场外基金和 REITs 返回 `code=3004`。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | `510300.SH` | 单只 ETF 的完整 thscode，必须保留市场后缀，如 `.SH` 或 `.SZ`；不接受逗号分隔的多个值。 |

系统会根据 `thscode` 识别标的类型。

## 调用示例

```text
工具：get_fund_market_snapshot
参数：
  - thscode: "510300.SH"
```

## 返回

返回 `{ timestamp, item: [FundMarketSnapshotItem, ...] }`。字段含义见 REST 端点
[场内基金行情快照](../../api/fund/market-snapshot.md#场内基金行情快照)。
