# 期货历史基差

[业务导航](README.md)

> **info**
> 工具名：`get_futures_basis_historical`
>
> 对应 REST 端点：[`GET /api/futures/basis/historical`](../../api/futures/futures-basis.md#basis-historical--basis-historical)


## 工具描述

> 查询指定期货合约的历史基差序列。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `spot_indicator_id` | string | 否 | — | 可选现货指标 ID；省略时使用上游默认口径。 |

## 调用示例

```text
工具：get_futures_basis_historical
参数：
  - thscode: "CU2601.SHF"
  - spot_indicator_id: "spot-cu"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货历史基差](../../api/futures/futures-basis.md#basis-historical--basis-historical)。
