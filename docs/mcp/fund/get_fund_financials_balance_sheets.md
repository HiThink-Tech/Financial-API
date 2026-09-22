# 基金资产负债表

[业务导航](README.md)

> **info**
> 工具名：`get_fund_financials_balance_sheets`
>
> 对应 REST 端点：[`GET /api/fund/financials/balance-sheets`](../../api/fund/fund-financials.md#financials-balance-sheets--基金资产负债表)


## 工具描述

> 查询基金资产、负债与所有者权益。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 调用示例

```text
工具：get_fund_financials_balance_sheets
参数：
  - thscode: "510300.SH"
```

## 返回

返回报告期、资产、负债与所有者权益字段；字段见 [基金资产负债表](../../api/fund/fund-financials.md#financials-balance-sheets--基金资产负债表)。
