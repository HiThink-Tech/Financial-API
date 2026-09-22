# 基金债券持仓报告日期

[业务导航](README.md)

> **info**
> 工具名：`get_fund_portfolio_bond_report_dates`
>
> 对应 REST 端点：[`GET /api/fund/portfolio/bond-report-dates`](../../api/fund/fund-portfolio.md#portfolio-bond-report-dates--基金债券持仓报告日期)


## 工具描述

> 查询基金债券持仓可用报告期。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `report_type` | string | 否 | — | 可选报告类型。 |

## 调用示例

```text
工具：get_fund_portfolio_bond_report_dates
参数：
  - thscode: "510300.SH"
  - report_type: "quarter"
```

## 返回

返回报告类型、名称与起止日期；字段见 [基金债券持仓报告日期](../../api/fund/fund-portfolio.md#portfolio-bond-report-dates--基金债券持仓报告日期)。
