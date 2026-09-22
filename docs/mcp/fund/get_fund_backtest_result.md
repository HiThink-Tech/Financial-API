# 基金在线回测

[业务导航](README.md)

> **info**
> 工具名：`get_fund_backtest_result`
>
> 对应 REST 端点：[`GET /api/fund/backtest/result`](../../api/fund/fund-backtest.md#backtest-result--基金在线回测)


## 工具描述

> 使用完整基金代码、买卖条件和定投参数执行在线回测，返回交易、指标与收益曲线。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 含市场后缀的完整基金代码，例如 `000001.OF`。 |
| `buy_conditions` | string | 是 | — | 买入条件 JSON 字符串。 |
| `sell_conditions` | string | 是 | — | 卖出条件 JSON 字符串。 |
| `buy_frequency_type` | string | 是 | — | 买入频率。 |
| `max_buy_times` | number | 是 | — | 最大买入次数。 |
| `per_buy_amount` | number | 是 | — | 每次买入金额。 |

## 调用示例

```text
工具：get_fund_backtest_result
参数：
  - thscode: "000001.OF"
  - buy_conditions: "{\"indicator_code\":\"rsi_pct\",\"operator\":\">\",\"value\":0.5}"
  - sell_conditions: "{\"indicator_code\":\"rsi_pct\",\"operator\":\"<\",\"value\":0.3}"
  - buy_frequency_type: "WEEKLY"
  - max_buy_times: 5
  - per_buy_amount: 100
```

## 返回

返回交易明细、回测指标与收益曲线；详见[基金在线回测](../../api/fund/fund-backtest.md#backtest-result--基金在线回测)。
