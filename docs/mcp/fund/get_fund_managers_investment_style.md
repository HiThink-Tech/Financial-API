# 基金经理投资风格

[业务导航](README.md)

> **info**
> 工具名：`get_fund_managers_investment_style`
>
> 对应 REST 端点：[`GET /api/fund/managers/investment-style`](../../api/fund/fund-managers.md#managers-investment-style--投资风格)


## 工具描述

> 查询基金经理代表基金、投资理念与行业偏好。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |

## 调用示例

```text
工具：get_fund_managers_investment_style
参数：
  - manager_id: "H000200384"
```

## 返回

返回代表基金、投资理念、管理规模与行业偏好；字段见 [投资风格](../../api/fund/fund-managers.md#managers-investment-style--投资风格)。
