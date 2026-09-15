# 期货公司合约历史持仓

[业务导航](README.md)

> **info**
> 工具名：`get_futures_positions_contract_historical`
>
> 对应 REST 端点：[`GET /api/futures/positions/contract-historical`](../../api/futures/positions-contract-historical.md#positions-contract-historical)


## 工具描述

> 查询指定公司在合约上的历史持仓与多空均价。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `variety` | string | 是 | — | 与合约一致的大写品种代码。 |
| `company` | string | 是 | — | 期货公司名称。 |
| `start_date` | string(date) | 是 | — | 调用日前一年内的开始日期；结束日期固定为调用日。 |

## 调用示例

```text
工具：get_futures_positions_contract_historical
参数：
  - thscode: "CU2601.SHF"
  - variety: "CU"
  - company: "示例期货"
  - start_date: "2026-01-01"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货公司合约历史持仓](../../api/futures/positions-contract-historical.md#positions-contract-historical)。
