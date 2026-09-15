# 基金经理详情

[业务导航](README.md)

> **info**
> 工具名：`get_fund_managers_detail`
>
> 对应 REST 端点：[`GET /api/fund/managers/detail`](../../api/fund/managers-detail.md#基金经理详情)


## 工具描述

> 查询基金经理基本信息与雷达对比。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

## 调用示例

```text
工具：get_fund_managers_detail
参数：
  - manager_id: "H000200384"
```

## 返回

返回经理资料、公司、收益与雷达对比；字段见 [基金经理详情](../../api/fund/managers-detail.md#基金经理详情)。
