# 基金行情数据

[业务导航](README.md)

- [场内基金行情快照](#market-snapshot)：`GET /api/fund/market/snapshot`
- [场内基金历史日线行情](#market-historical)：`GET /api/fund/market/historical`

- 行情接口使用带市场后缀的单只基金 `thscode` 唯一定位标的；快照支持 ETF/LOF，历史日线仅支持 ETF。价格字段按原始货币计价。

<a id="market-snapshot"></a>
<a id="market-snapshot--场内基金行情快照"></a>
## 场内基金行情快照

```text
GET /api/fund/market/snapshot
```

支持 ETF 和 LOF。场外基金、REITs 或尚未开放的基金叶子类型返回 `code=3004`；支持的标的尚无可用快照时返回 `code=3002`。

<a id="market-snapshot--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 ETF 或 LOF 的完整 thscode，必须保留市场后缀，如 `510300.SH`、`161725.SZ`；不接受逗号分隔的多个值。 |

系统会根据 `thscode` 识别标的类型。

<a id="market-snapshot--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/market/snapshot?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

<a id="market-snapshot--响应示例"></a>
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

<a id="market-snapshot--返回字段"></a>
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

<a id="market-historical"></a>

<a id="market-historical--场内基金历史日线行情"></a>
## 场内基金历史日线行情

```text
GET /api/fund/market/historical
```

仅支持 ETF；单次只允许一个 `thscode`，查询窗口最长 5 个自然年。价格数据采用前复权口径。

<a id="market-historical--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 ETF 的完整 thscode，必须保留市场后缀；不接受逗号分隔的多个值。 |
| `interval` | string | 否 | `1d` | K 线周期，当前仅支持 `1d`（日线）。 |
| `start` | long | 是 | — | 起始时间，毫秒级 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒级 Unix 时间戳；必须不早于 `start`，且窗口最长 5 个自然年。 |

<a id="market-historical--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/market/historical?thscode=510300.SH&interval=1d&start=1626451200000&end=1784217600000' \
  -H 'X-api-key: <your-api-key>'
```

<a id="market-historical--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "f47444ed0e0d4e1c883ecb66511dc311",
  "data": {
    "timestamp": 1784131200000,
    "thscode": "510300.SH",
    "interval": "1d",
    "adjust": null,
    "item": [
      {
        "date_ms": 1626624000000,
        "volume": 332046160,
        "turnover": 1709347700,
        "open_price": 4.728,
        "high_price": 4.769,
        "low_price": 4.687,
        "close_price": 4.759
      },
      {
        "date_ms": 1626710400000,
        "volume": 306679330,
        "turnover": 1581145200,
        "open_price": 4.721,
        "high_price": 4.76,
        "low_price": 4.712,
        "close_price": 4.746
      }
    ]
  }
}
```

<a id="market-historical--返回字段"></a>
### 返回字段

`data` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据就绪时间，取序列中最新一根 K 线的有效时间。 |
| `thscode` | string | 请求中的 ETF thscode。 |
| `interval` | string | K 线周期，固定为 `1d`。 |
| `adjust` | null | 当前固定为 `null`；价格数据仍采用前复权口径。 |
| `item` | array | 历史日线数据列表。 |

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | 交易日期，毫秒级 Unix 时间戳。 |
| `open_price` | number | 前复权开盘价。 |
| `high_price` | number | 前复权最高价。 |
| `low_price` | number | 前复权最低价。 |
| `close_price` | number | 前复权收盘价。 |
| `volume` | number | 成交量。 |
| `turnover` | number | 成交额。 |

通用参数与错误码参见[基金 API 总览](README.md)。
