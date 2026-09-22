# 基金资产配置

[业务导航](README.md)

> **info**
> 工具名：`get_fund_portfolio_asset_allocation`
>
> 对应 REST 端点：[`GET /api/fund/portfolio/asset-allocation`](../../api/fund/fund-portfolio.md#portfolio-asset-allocation--基金资产配置)


## 工具描述

> 查询基金股票、债券、存款与其他资产配置比例。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 调用示例

```text
工具：get_fund_portfolio_asset_allocation
参数：
  - thscode: "510300.SH"
```

## 返回

返回报告日期与各资产配置比例；字段见 [基金资产配置](../../api/fund/fund-portfolio.md#portfolio-asset-allocation--基金资产配置)。
