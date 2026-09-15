# 期货公司合约日持仓

[业务导航](README.md)

> **info**
> 工具名：`get_futures_positions_contract_daily`
>
> 对应 REST 端点：[`GET /api/futures/positions/contract-daily`](../../api/futures/positions-contract-daily.md#positions-contract-daily)


## 工具描述

> 查询指定合约和交易日的公司持仓与多空均价。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `variety` | string | 是 | — | 与合约一致的大写品种代码。 |
| `date` | string(date) | 是 | — | 交易日期。 |

## 调用示例

```text
工具：get_futures_positions_contract_daily
参数：
  - thscode: "CU2601.SHF"
  - variety: "CU"
  - date: "2026-09-10"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货公司合约日持仓](../../api/futures/positions-contract-daily.md#positions-contract-daily)。
