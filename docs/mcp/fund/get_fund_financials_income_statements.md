# 基金利润表

[业务导航](README.md)

> **info**
> 工具名：`get_fund_financials_income_statements`
>
> 对应 REST 端点：[`GET /api/fund/financials/income-statements`](../../api/fund/fund-financials.md#financials-income-statements--基金利润表)


## 工具描述

> 查询基金经营业绩及收益分配。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 调用示例

```text
工具：get_fund_financials_income_statements
参数：
  - thscode: "510300.SH"
```

## 返回

返回报告期、收入、费用与利润字段；字段见 [基金利润表](../../api/fund/fund-financials.md#financials-income-statements--基金利润表)。
