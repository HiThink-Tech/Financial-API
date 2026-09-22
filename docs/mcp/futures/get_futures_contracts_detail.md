# 期货合约详情

[业务导航](README.md)

> **info**
> 工具名：`get_futures_contracts_detail`
>
> 对应 REST 端点：[`GET /api/futures/contracts/detail`](../../api/futures/futures-reference.md#contracts-detail--contracts-detail)


## 工具描述

> 按完整同花顺代码查询期货合约详情。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |

## 调用示例

```text
工具：get_futures_contracts_detail
参数：
  - thscode: "CU2601.SHF"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货合约详情](../../api/futures/futures-reference.md#contracts-detail--contracts-detail)。
