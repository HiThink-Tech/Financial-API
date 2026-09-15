# 基金回撤指标

[业务导航](README.md)

> **info**
> 工具名：`get_fund_performance_drawdowns`
>
> 对应 REST 端点：[`GET /api/fund/performance/drawdowns`](../../api/fund/performance-drawdowns.md#基金最大回撤)


## 工具描述

> 查询基金十个区间的最大回撤。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 调用示例

```text
工具：get_fund_performance_drawdowns
参数：
  - thscode: "510300.SH"
```

## 返回

返回基金代码与十个区间最大回撤；字段见 [基金最大回撤](../../api/fund/performance-drawdowns.md#基金最大回撤)。
