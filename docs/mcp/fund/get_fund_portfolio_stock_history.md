# 基金历史股票持仓

[业务导航](README.md)

> **info**
> 工具名：`get_fund_portfolio_stock_history`
>
> 对应 REST 端点：[`GET /api/fund/portfolio/stock-history`](../../api/fund/fund-portfolio.md#portfolio-stock-history--基金历史股票持仓)


## 工具描述

> 查询基金指定报告期的历史股票持仓。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 是 | — | 报告类型。 |
| `end_date` | string | 是 | — | 报告截止日期。 |

## 调用示例

```text
工具：get_fund_portfolio_stock_history
参数：
  - thscode: "510300.SH"
  - report_type: "quarter"
  - end_date: "2026-06-30"
```

## 返回

返回历史股票持仓明细；`rank` 仅前十大持仓为 `1`–`10`，其余持仓为 `null`。字段见 [基金历史股票持仓](../../api/fund/fund-portfolio.md#portfolio-stock-history--基金历史股票持仓)。
