# 公司品种日持仓

[业务导航](README.md)

> **info**
> 工具名：`get_futures_positions_company_variety_daily`
>
> 对应 REST 端点：[`GET /api/futures/positions/company-variety-daily`](../../api/futures/positions-company-variety-daily.md#positions-company-variety-daily)


## 工具描述

> 查询指定日期和品种集合的期货公司持仓。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date` | string(date) | 是 | — | 交易日期。 |
| `varieties` | string | 是 | — | 1至5个逗号分隔的大写品种代码。 |

## 调用示例

```text
工具：get_futures_positions_company_variety_daily
参数：
  - date: "2026-09-10"
  - varieties: "CU,AU"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货公司品种日持仓](../../api/futures/positions-company-variety-daily.md#positions-company-variety-daily)。
