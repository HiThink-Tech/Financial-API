# 期权合约详情

[业务导航](README.md)

> **info**
> 工具名：`get_options_contracts_detail`
>
> 对应 REST 端点：[`GET /api/options/contracts/detail`](../../api/options/contracts-detail.md#contracts-detail)


## 工具描述

> 按完整同花顺代码查询期权合约详情。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约完整同花顺代码。 |

## 调用示例

```text
工具：get_options_contracts_detail
参数：
  - thscode: "IO2601-C-4000.CFE"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期权合约详情](../../api/options/contracts-detail.md#contracts-detail)。
