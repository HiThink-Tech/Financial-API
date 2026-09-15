# 期货历史仓单

[业务导航](README.md)

> **info**
> 工具名：`get_futures_warehouse_receipts_historical`
>
> 对应 REST 端点：[`GET /api/futures/warehouse-receipts/historical`](../../api/futures/warehouse-receipts-historical.md)


## 工具描述

> 查询期货合约在指定日期范围内的仓单记录。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `start_date` | string(date) | 是 | — | 开始日期。 |
| `end_date` | string(date) | 是 | — | 结束日期。 |

## 调用示例

```text
工具：get_futures_warehouse_receipts_historical
参数：
  - thscode: "CU2601.SHF"
  - start_date: "2026-09-01"
  - end_date: "2026-09-10"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货历史仓单](../../api/futures/warehouse-receipts-historical.md)。
