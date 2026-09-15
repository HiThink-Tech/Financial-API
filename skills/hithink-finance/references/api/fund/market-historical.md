# 场内基金历史日线行情

[业务导航](README.md)

- 行情接口使用带市场后缀的单只 ETF `thscode` 唯一定位标的；价格字段按原始货币计价。

## 场内基金历史日线行情

```text
GET /api/fund/market/historical
```

仅支持 ETF；单次只允许一个 `thscode`，查询窗口最长 5 个自然年。价格数据采用前复权口径。

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 ETF 的完整 thscode，必须保留市场后缀；不接受逗号分隔的多个值。 |
| `interval` | string | 否 | `1d` | K 线周期，当前仅支持 `1d`（日线）。 |
| `start` | long | 是 | — | 起始时间，毫秒级 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒级 Unix 时间戳；必须不早于 `start`，且窗口最长 5 个自然年。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/market/historical?thscode=510300.SH&interval=1d&start=1626451200000&end=1784217600000' \
  -H 'X-api-key: <your-api-key>'
```

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
