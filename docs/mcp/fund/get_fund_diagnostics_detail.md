# 基金诊断详情

[业务导航](README.md)

> **info**
> 工具名：`get_fund_diagnostics_detail`
>
> 对应 REST 端点：[`GET /api/fund/diagnostics/detail`](../../api/fund/diagnostics-detail.md)


## 工具描述

> 查询基金诊断维度、同类对比与韧性指标。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 调用示例

```text
工具：get_fund_diagnostics_detail
参数：
  - thscode: "510300.SH"
```

## 返回

返回诊断维度、同类维度、概率、区间和韧性结构；字段见 [基金诊断详情](../../api/fund/diagnostics-detail.md)。
