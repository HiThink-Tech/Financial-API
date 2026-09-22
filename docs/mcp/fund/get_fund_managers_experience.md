# 基金经理从业经历

[业务导航](README.md)

> **info**
> 工具名：`get_fund_managers_experience`
>
> 对应 REST 端点：[`GET /api/fund/managers/experience`](../../api/fund/fund-managers.md#managers-experience--从业经历)


## 工具描述

> 查询基金经理荣誉、重仓资产与投资经历。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

## 调用示例

```text
工具：get_fund_managers_experience
参数：
  - manager_id: "H000200384"
```

## 返回

返回荣誉、重仓资产与投资经历三组结构化数据；字段见 [从业经历](../../api/fund/fund-managers.md#managers-experience--从业经历)。
