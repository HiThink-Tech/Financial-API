# 场内基金行情快照

[业务导航](README.md)

- 行情接口使用带市场后缀的单只基金 `thscode` 唯一定位标的；快照支持 ETF/LOF，历史日线仅支持 ETF。价格字段按原始货币计价。

## 场内基金行情快照

```text
GET /api/fund/market/snapshot
```

支持 ETF 和 LOF。场外基金、REITs 或尚未开放的基金叶子类型返回 `code=3004`；支持的标的尚无可用快照时返回 `code=3002`。

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 ETF 或 LOF 的完整 thscode，必须保留市场后缀，如 `510300.SH`、`161725.SZ`；不接受逗号分隔的多个值。 |

系统会根据 `thscode` 识别标的类型。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/market/snapshot?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "558cdc5105964a93953b1a541e7af901",
  "data": {
    "timestamp": 1784210584000,
    "item": [
      {
        "thscode": "510300.SH",
        "ticker": "510300",
        "last_price": 4.753,
        "open_price": 4.775,
        "high_price": 4.825,
        "low_price": 4.724,
        "prev_price": 4.838,
        "price_change_ratio_pct": -1.756924,
        "price_change": -0.085,
        "price_amplitude_ratio_pct": 2.08764,
        "volume": 1657822800,
        "turnover": 7909234100,
        "turnover_ratio_pct": 9.012068
      }
    ]
  }
}
```

### 返回字段

`data.timestamp` 为本次快照最新的上游有效时间，使用毫秒级 Unix 时间戳；无有效数据时为 `null`。

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | ETF 或 LOF 的完整 thscode。 |
| `ticker` | string | ETF 或 LOF 的纯基金代码，仅用于展示。 |
| `last_price` | number | 最新价。 |
| `open_price` | number | 开盘价。 |
| `high_price` | number | 最高价。 |
| `low_price` | number | 最低价。 |
| `prev_price` | number | 昨收价。 |
| `price_change_ratio_pct` | number | 涨跌幅，百分数原值。 |
| `price_change` | number | 涨跌额。 |
| `price_amplitude_ratio_pct` | number | 振幅，百分数原值。 |
| `volume` | number | 成交量。 |
| `turnover` | number | 成交额。 |
| `turnover_ratio_pct` | number | 换手率，百分数原值。 |
