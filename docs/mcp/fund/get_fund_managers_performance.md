# 基金经理业绩

[业务导航](README.md)

> **info**
> 工具名：`get_fund_managers_performance`
>
> 对应 REST 端点：[`GET /api/fund/managers/performance`](../../api/fund/managers-performance.md#基金经理业绩)


## 工具描述

> 查询基金经理、同类与基准的收益序列。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |
| `range` | enum | 是 | — | `month` / `tmonth` / `year` / `nowyear` / `now`。 |

## 调用示例

```text
工具：get_fund_managers_performance
参数：
  - manager_id: "H000200384"
  - range: "year"
```

## 返回

返回经理、同类和基准的收益序列；字段见 [基金经理业绩](../../api/fund/managers-performance.md#基金经理业绩)。
