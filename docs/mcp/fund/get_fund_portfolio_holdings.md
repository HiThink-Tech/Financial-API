# 基金重仓股

[业务导航](README.md)

> **info**
> 工具名：`get_fund_portfolio_holdings`
>
> 对应 REST 端点：[`GET /api/fund/portfolio/holdings`](../../api/fund/portfolio-holdings.md)


## 工具描述

> 查询单只基金定期披露的股票、债券和基金持仓，并返回持仓占比、排名与汇总指标。
> 持仓来自定期披露，不代表实时持仓。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | `025480.OF` | 完整基金 thscode，必须保留市场后缀，如 `025480.OF` / `510300.SH` / `161725.SZ`。 |

## 调用示例

```text
工具：get_fund_portfolio_holdings
参数：
  - thscode: "025480.OF"
```

## 返回

返回 `{ timestamp, item: [FundHoldingItem, ...] }`。字段含义见 REST 端点
[基金重仓股](../../api/fund/portfolio-holdings.md#返回字段)。
