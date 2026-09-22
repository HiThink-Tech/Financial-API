# 基金财务指标

[业务导航](README.md)

> **info**
> 工具名：`get_fund_financials_indicators`
>
> 对应 REST 端点：[`GET /api/fund/financials/indicators`](../../api/fund/fund-financials.md#financials-indicators--基金财务指标)


## 工具描述

> 查询基金主要财务指标。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 调用示例

```text
工具：get_fund_financials_indicators
参数：
  - thscode: "510300.SH"
```

## 返回

返回报告期及基金主要财务指标；字段见 [基金财务指标](../../api/fund/fund-financials.md#financials-indicators--基金财务指标)。
