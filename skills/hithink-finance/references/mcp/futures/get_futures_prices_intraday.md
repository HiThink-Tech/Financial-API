# 期货分时行情

[业务导航](README.md)

> **info**
> 工具名：`get_futures_prices_intraday`
>
> 对应 REST 端点：[`GET /api/futures/prices/intraday`](../../api/futures/prices-intraday.md#prices-intraday)


## 工具描述

> 查询期货合约当前或最近交易日指定行情阶段的分时行情。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `session` | enum | 否 | — | 行情阶段：`pre_market`-盘前、`intraday`-盘中、`post_market`-盘后；省略时使用 `intraday`。 |

## 调用示例

```text
工具：get_futures_prices_intraday
参数：
  - thscode: "CU2601.SHF"
  - session: "intraday"
```

## 返回

返回统一数据对象；字段、空值和数组语义见 [期货分时行情](../../api/futures/prices-intraday.md#prices-intraday)。
