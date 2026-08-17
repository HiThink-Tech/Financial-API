# A 股集合竞价端点

> 查询一个或多个 A 股标的的集合竞价快照，或查询指定日期的短线风向标竞价基准。标的代码必须是带交易所后缀的 A 股 `thscode`。

## 1. 个股/多股集合竞价快照

```text
GET /api/a-share/auction/snapshot
```

operationId：`get_a_share_auction_snapshot`。

| 参数 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| `thscodes` | string | 是 | 1–100 个 A 股 `thscode`，英文逗号分隔；去重后按首次出现顺序查询。 | — |
| `stage` | string | 否 | `live` 表示竞价实时阶段，`final` 表示竞价终态。 | `final` |

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/auction/snapshot?thscodes=600519.SH,000001.SZ&stage=final' \
  -H 'X-api-key: <your-api-key>'
```

`data` 为 `{timestamp, auction_phase, data_status, total, item[]}`。`timestamp` 始终是接口响应组装时间，在 `live`、`final`、`suspended` 和 `not_ready` 场景都会返回；上游行情时间仅用于判断数据新鲜度，不表示响应时间。`data_status` 用于区分数据尚未就绪、竞价完成或停牌等状态。`item[]` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` / `ticker` / `name` | string | 标的唯一代码、纯代码和名称。 |
| `auction_price` | number/null | 竞价价格。 |
| `auction_pct` | number/null | 竞价涨跌幅，百分数原值。 |
| `auction_volume` | number/null | 竞价成交量，单位为手。 |
| `auction_amount` | number/null | 竞价成交额。 |
| `auction_unmatched` | number/null | 未匹配量。 |
| `auction_turnover_pct` | number/null | 竞价换手率，百分数原值。 |
| `auction_yesterday_ratio_pct` | number/null | 相对昨日成交量比例，百分数原值。 |
| `auction_volume_ratio` | number/null | 竞价量比。 |
| `pre_close_price` / `open_price` / `last_price` | number/null | 昨收、开盘和最新价。 |
| `float_market_cap` | number/null | 流通市值。 |

### 避错要点

- 只支持 `.SH`、`.SZ`、`.BJ` A 股代码；指数、板块和基金代码返回参数错误。
- 原始 token 超过 100、空 token 或格式错误会在请求层失败；不要先去重再规避数量上限。
- 非竞价时段可能返回未就绪或停牌状态；不得用零值或模拟行情补齐空字段。

## 2. 短线风向标竞价基准

```text
GET /api/a-share/auction/short-term-benchmark
```

operationId：`get_a_share_auction_short_term_benchmark`。

| 参数 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| `date` | string | 否 | 查询日期，格式 `YYYY-MM-DD`；缺失或空字符串时使用 `Asia/Shanghai` 当日。 | 上海时区当日 |

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/auction/short-term-benchmark?date=2026-08-14' \
  -H 'X-api-key: <your-api-key>'
```

`data` 为 `{timestamp, date, date_ms, item[]}`。`timestamp` 是接口响应组装时间；`date` 是最终查询日期，格式 `YYYY-MM-DD`；`date_ms` 是该日期在 `Asia/Shanghai` 当日零点的毫秒 Unix 时间戳。`item[]` 字段为 `thscode`、`ticker`、`name`、`auction_pct`、`tags`。

### 避错要点

- `date` 是 `YYYY-MM-DD` 字符串，不是毫秒时间戳。
- 显式日期按原值查询，非交易日不自动回退；业务为空时不得擅自改查前一交易日。
- `tags` 保留服务端返回的标签集合；不要根据涨跌幅自行推导或替换标签。
