# 基金行业配置

[业务导航](README.md)

> **info**
> 工具名：`get_fund_portfolio_industry_allocation`
>
> 对应 REST 端点：[`GET /api/fund/portfolio/industry-allocation`](../../api/fund/fund-portfolio.md#portfolio-industry-allocation--基金行业配置)


## 工具描述

> 查询单只基金的申万行业配置。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 调用示例

```text
工具：get_fund_portfolio_industry_allocation
参数：
  - thscode: "510300.SH"
```

## 返回

返回报告期、行业名称与配置比例；字段见 [基金行业配置](../../api/fund/fund-portfolio.md#portfolio-industry-allocation--基金行业配置)。
