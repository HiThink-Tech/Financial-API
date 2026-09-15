# 期货品种日持仓

[业务导航](README.md)

> **info**
> 工具名：`get_futures_positions_variety_daily`
>
> 对应 REST 端点：[`GET /api/futures/positions/variety-daily`](../../api/futures/positions-variety-daily.md#positions-variety-daily)


## 工具描述

> 查询指定交易日的期货品种持仓。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date` | string(date) | 是 | — | 交易日期，格式 yyyy-MM-dd。 |

## 调用示例

```text
工具：get_futures_positions_variety_daily
参数：
  - date: "2026-09-10"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货品种日持仓](../../api/futures/positions-variety-daily.md#positions-variety-daily)。
