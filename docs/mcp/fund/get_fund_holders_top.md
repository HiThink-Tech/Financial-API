# 基金前十大持有人

[业务导航](README.md)

> **info**
> 工具名：`get_fund_holders_top`
>
> 对应 REST 端点：[`GET /api/fund/holders/top`](../../api/fund/holders-top.md#基金前十大持有人)


## 工具描述

> 查询基金前十大持有人及持有份额。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `limit` | integer | 否 | — | 返回条数，最大 10。 |

## 调用示例

```text
工具：get_fund_holders_top
参数：
  - thscode: "510300.SH"
  - limit: 10
```

## 返回

返回持有人、排名、份额、比例与报告日期；字段见 [基金前十大持有人](../../api/fund/holders-top.md#基金前十大持有人)。
