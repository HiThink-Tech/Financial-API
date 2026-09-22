# 基金在线回测

[业务导航](README.md)

- [基金在线回测](#backtest-result)：`GET /api/fund/backtest/result`
- [基金回测可用指标](#backtest-indicators)：`GET /api/fund/backtest/indicators`

- 回测基金使用含市场后缀的完整 `thscode`，例如 `000001.OF`；裸代码和上游市场代码不是公开入参。
- 回测条件以 URL 编码的 JSON 字符串传递；具体指标、操作符和阈值以“回测可用指标”返回结果为准。
- 回测日期使用 `yyyy-MM-dd` 字符串；数值和动态曲线键值保持上游语义，不进行单位换算。
- 示例参数已通过真实上游调用验证；返回数据会随上游更新，响应示例仅展示部分交易和曲线点。

<a id="backtest-result"></a>
<a id="backtest-result--基金在线回测"></a>
## 基金在线回测

```text
GET /api/fund/backtest/result
```

<a id="backtest-result--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 含市场后缀的完整基金代码，例如 `000001.OF`。 |
| `buy_conditions` | string | 是 | — | 买入条件 JSON 字符串，必须是对象或数组。 |
| `sell_conditions` | string | 是 | — | 卖出条件 JSON 字符串，必须是对象或数组。 |
| `buy_frequency_type` | string | 是 | — | 买入频率，具体值由上游判定。 |
| `max_buy_times` | number | 是 | — | 最大买入次数。 |
| `per_buy_amount` | number | 是 | — | 每次买入金额。 |

<a id="backtest-result--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/backtest/result?thscode=000001.OF&buy_conditions=%7B%22indicator_code%22%3A%22rsi_pct%22%2C%22operator%22%3A%22%3E%22%2C%22value%22%3A0.5%7D&sell_conditions=%7B%22indicator_code%22%3A%22rsi_pct%22%2C%22operator%22%3A%22%3C%22%2C%22value%22%3A0.3%7D&buy_frequency_type=WEEKLY&max_buy_times=5&per_buy_amount=100' \
  -H 'X-api-key: <your-api-key>'
```

<a id="backtest-result--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "5fbc0c2db60a4e298a0d48c4de049642",
  "data": {
    "start_date": "2023-09-08",
    "end_date": "2026-09-08",
    "metrics": {
      "strategy_return": 0.422452870829321,
      "fund_return": 0.4099340336826627,
      "excess_return": 0.0125188371466583,
      "win_rate": 0,
      "max_drawdown": 0.2700061087331572
    },
    "trade_count": 726,
    "trades": [
      {
        "trade_date": "2023-09-11",
        "type": "BUY",
        "price": 5.8066057624,
        "amount": 100,
        "shares": 17.22176501934028,
        "profit": null
      }
    ],
    "curve_points": [
      {
        "2023-09-08": 0
      }
    ]
  }
}
```

<a id="backtest-result--返回字段"></a>
### 返回字段

`data` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `start_date` | string | 回测开始日期。 |
| `end_date` | string | 回测结束日期。 |
| `metrics` | object | 回测指标。 |
| `trade_count` | number | 交易次数。 |
| `trades` | array | 交易明细。 |
| `curve_points` | JSON | 收益曲线点集合，兼容数组或对象结构。 |

`data.metrics` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `strategy_return` | number | 策略收益。 |
| `fund_return` | number | 基金收益。 |
| `excess_return` | number | 超额收益。 |
| `win_rate` | number | 胜率。 |
| `max_drawdown` | number | 最大回撤。 |

`data.trades[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `trade_date` | string | 交易日期。 |
| `type` | string | 交易类型。 |
| `price` | number | 交易价格。 |
| `amount` | number | 交易金额。 |
| `shares` | number | 交易份额。 |
| `profit` | number \| null | 交易收益。 |

<a id="backtest-indicators"></a>

<a id="backtest-indicators--基金回测可用指标"></a>
## 基金回测可用指标

```text
GET /api/fund/backtest/indicators
```

<a id="backtest-indicators--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| - | - | - | - | 无业务参数。 | - |

<a id="backtest-indicators--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/backtest/indicators' \
  -H 'X-api-key: <your-api-key>'
```

<a id="backtest-indicators--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "af1c4ed643f744218950885dd58bd2c9",
  "data": [
    {
      "id": 1,
      "indicator_name": "净值波动",
      "indicator_code": "rsi_pct",
      "type": 0,
      "value_kind": 0,
      "support_operation": ">,<",
      "unit": null,
      "description": null,
      "state_rules": null,
      "create_time": "2026-05-27T16:57:32",
      "update_time": "2026-05-27T16:57:32"
    }
  ]
}
```

<a id="backtest-indicators--返回字段"></a>
### 返回字段

`data[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 指标标识。 |
| `indicator_name` | string | 指标名称。 |
| `indicator_code` | string | 指标编码。 |
| `type` | number | 上游定义的指标类型。 |
| `value_kind` | number | 上游定义的指标值类型。 |
| `support_operation` | string | 支持的条件操作符。 |
| `unit` | string \| null | 指标单位。 |
| `description` | string \| null | 指标说明。 |
| `state_rules` | string \| null | 状态规则。 |
| `create_time` | string | 上游记录创建时间，使用 ISO 本地日期时间。 |
| `update_time` | string | 上游记录更新时间，使用 ISO 本地日期时间。 |
