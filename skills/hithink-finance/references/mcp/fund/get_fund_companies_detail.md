# 基金公司详情

[业务导航](README.md)

> **info**
> 工具名：`get_fund_companies_detail`
>
> 对应 REST 端点：[`GET /api/fund/companies/detail`](../../api/fund/companies-detail.md)


## 工具描述

> 按基金公司 ID 查询公司详情。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `company_id` | string | 是 | — | 基金公司 ID。 |

## 调用示例

```text
工具：get_fund_companies_detail
参数：
  - company_id: "00089990"
```

## 返回

返回 `{ timestamp, item[] }`；字段见 [基金公司详情](../../api/fund/companies-detail.md)。
