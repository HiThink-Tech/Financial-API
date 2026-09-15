# 基金分红记录

[业务导航](README.md)

> **info**
> 工具名：`get_fund_corporate_actions_dividends`
>
> 对应 REST 端点：[`GET /api/fund/corporate-actions/dividends`](../../api/fund/corporate-actions-dividends.md)


## 工具描述

> 查询单只基金的历史分红记录。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

## 调用示例

```text
工具：get_fund_corporate_actions_dividends
参数：
  - thscode: "510300.SH"
```

## 返回

返回现金分红、进度和关键日期；字段见 [基金分红记录](../../api/fund/corporate-actions-dividends.md)。
