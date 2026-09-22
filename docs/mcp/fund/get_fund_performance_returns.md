# 基金区间收益

[业务导航](README.md)

> **info**
> 工具名：`get_fund_performance_returns`
>
> 对应 REST 端点：[`GET /api/fund/performance/returns`](../../api/fund/fund-performance.md#performance-returns--基金区间收益)


## 工具描述

> 查询基金多区间收益率，并返回对应区间的同类平均、同类排名与参与排名总数。
> 收益率为百分数原值，如 `8.88` 表示 `8.88%`。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

## 调用示例

```text
工具：get_fund_performance_returns
参数：
  - thscode: "510300.SH"
```

## 返回

返回 `{ timestamp, item: [FundReturnsItem, ...] }`。字段含义见 REST 端点
[基金区间收益](../../api/fund/fund-performance.md#performance-returns--基金区间收益)。
