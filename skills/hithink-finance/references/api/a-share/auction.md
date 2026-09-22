# 集合竞价数据

[业务导航](README.md)

- [A股集合竞价快照](#auction-snapshot)：`GET /api/a-share/auction/snapshot`
- [短线风向标竞价基准](#auction-short-term-benchmark)：`GET /api/a-share/auction/short-term-benchmark`

集合竞价接口返回统一 `ApiResponse` 信封。`thscode` 使用带交易所后缀的标准代码，时间戳均为毫秒级 Unix 时间戳。

- A 股标的使用带交易所后缀的完整 `thscode`；时间戳均为毫秒级 Unix 时间戳，时区按 `Asia/Shanghai`。

<a id="auction-snapshot"></a>
<a id="auction-snapshot--a股集合竞价快照"></a>
## A股集合竞价快照

```text
GET /api/a-share/auction/snapshot
```

<a id="auction-snapshot--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 是 | — | 一个或多个 A 股 thscode，使用英文逗号分隔；单次请求当前最多 100 个，按分隔后的原始 token 数在去重前校验。服务端按请求顺序去重返回。 |
| `stage` | enum | 否 | `final` | `live`（实时阶段）或 `final`（终态）。 |

<a id="auction-snapshot--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/auction/snapshot?thscodes=600519.SH,000001.SZ&stage=final' \
  -H 'X-api-key: <your-api-key>'
```

<a id="auction-snapshot--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "99f4d83804b54d1c90681add4505eca0",
  "data": {
    "timestamp": 1786689000000,
    "auction_phase": "final",
    "data_status": "ready",
    "total": 1,
    "item": [
      {
        "thscode": "600519.SH",
        "ticker": "600519",
        "name": "贵州茅台",
        "auction_price": 1421.0,
        "auction_pct": 0.35,
        "auction_volume": 12600,
        "auction_amount": 17904600,
        "auction_unmatched": 800,
        "auction_turnover_pct": 0.01,
        "auction_yesterday_ratio_pct": 82.4,
        "auction_volume_ratio": 1.12,
        "pre_close_price": 1416.04,
        "open_price": 1421.0,
        "last_price": 1421.0,
        "float_market_cap": 1785000000000
      }
    ]
  }
}
```

<a id="auction-snapshot--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `data.timestamp` | long | 接口响应组装时间，毫秒 Unix 时间戳；实时、终态、停牌及 `not_ready` 场景均会返回。上游竞价行情时间仅用于判断数据新鲜度。 |
| `data.auction_phase` | string | 集合竞价阶段。 |
| `data.data_status` | string | 数据状态。 |
| `data.total` | integer | 返回标的数量。 |
| `data.item` | array | 集合竞价明细列表。 |

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` / `ticker` / `name` | string | 标准代码、纯代码与股票简称。 |
| `auction_price` / `auction_pct` | number | 竞价价格与竞价涨跌幅百分数原值。 |
| `auction_volume` / `auction_amount` / `auction_unmatched` | number | 竞价成交量、成交额与未匹配量。 |
| `auction_turnover_pct` / `auction_yesterday_ratio_pct` / `auction_volume_ratio` | number | 竞价换手率、相对昨日成交量比例与竞价量比。 |
| `pre_close_price` / `open_price` / `last_price` | number | 前收盘价、开盘价与最新价。 |
| `float_market_cap` | number | 流通市值。 |

<a id="auction-short-term-benchmark"></a>

<a id="auction-short-term-benchmark--短线风向标竞价基准"></a>
## 短线风向标竞价基准

```text
GET /api/a-share/auction/short-term-benchmark
```

<a id="auction-short-term-benchmark--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `date` | string | 否 | 上海时区当日 | 查询日期，格式 `yyyy-MM-dd`；缺失或传入空字符串时使用 `Asia/Shanghai` 当日，显式指定非交易日时不自动回退。 |

<a id="auction-short-term-benchmark--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/auction/short-term-benchmark?date=2026-08-14' \
  -H 'X-api-key: <your-api-key>'
```

<a id="auction-short-term-benchmark--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "4e2f1c8c38e54ff1be9be3d17533bef9",
  "data": {
    "timestamp": 1786690800000,
    "date": "2026-08-14",
    "date_ms": 1786636800000,
    "item": [
      {
        "thscode": "600519.SH",
        "ticker": "600519",
        "name": "贵州茅台",
        "auction_pct": 0.35,
        "tags": [
          "高开",
          "放量"
        ]
      }
    ]
  }
}
```

<a id="auction-short-term-benchmark--返回字段"></a>
### 返回字段

`data` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 接口响应组装时间，毫秒 Unix 时间戳。 |
| `date` | string | 最终查询日期，格式 `yyyy-MM-dd`。 |
| `date_ms` | long | 最终查询日期在 `Asia/Shanghai` 当日零点的毫秒 Unix 时间戳。 |
| `item` | array | 短线风向标竞价基准明细。 |

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 完整 A 股 thscode。 |
| `ticker` | string | 纯股票代码。 |
| `name` | string | 股票简称。 |
| `auction_pct` | number | 集合竞价涨跌幅，百分数原值。 |
| `tags` | array | 短线风向标标签。 |

通用鉴权、响应信封与错误码参见 [API 参考](../README.md)。
