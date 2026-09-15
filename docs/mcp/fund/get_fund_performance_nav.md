# 基金净值

[业务导航](README.md)

> **info**
> 工具名：`get_fund_performance_nav`
>
> 对应 REST 端点：[`GET /api/fund/performance/nav`](../../api/fund/performance-nav.md#基金净值)


## 工具描述

> 查询基金单位净值和复权净值。不传 `range` 时只返回最新一个净值日期；传入 `range`
> 时返回区间序列。`nav_type` 控制返回单位净值、复权净值或二者。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |
| `range` | enum | 否 | 最新一条 | `week` / `month` / `tmonth` / `hyear` / `year` / `twoyear` / `tyear` / `fyear`。 |
| `nav_type` | enum | 否 | `unit,adj` | `unit`（单位净值）/ `adj`（复权净值）/ `unit,adj`。 |

## 调用示例

```text
工具：get_fund_performance_nav
参数：
  - thscode: "510300.SH"
  - range: "year"
  - nav_type: "unit"
```

## 返回

返回 `{ timestamp, item: [FundNavItem, ...] }`。字段含义见 REST 端点
[基金净值](../../api/fund/performance-nav.md#基金净值)。
