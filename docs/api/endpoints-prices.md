# 行情与公司行为端点

> A 股行情快照、历史 K 线、复权因子事件流。参数定义、响应字段以本文档为准。

## 1. 行情快照

```text
GET /api/a-share/prices/snapshot
```

获取单只、多只或全市场 A 股最新行情快照。支持两种模式：按 `thscodes` 显式批量，或 `limit/offset` 全市场分页。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscodes` | query | string | 否 | 逗号分隔的 thscode 列表，批量模式。传此参数时忽略分页。 | — |
| `limit` | query | integer | 否 | 每页条数（全市场分页模式）。 | `100` |
| `offset` | query | integer | 否 | 分页偏移（全市场分页模式）。 | `0` |

> `thscodes` 与 `limit/offset` 二选一。省略 `thscodes` 时进入全市场分页模式。

### 请求示例

```bash
# 批量模式：指定股票
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?thscodes=600519.SH,000001.SZ' \
  -H 'X-api-key: <your-api-key>'

# 全市场分页模式
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?limit=100&offset=0' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `SnapshotData`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long \| null | 数据就绪时间（毫秒）。按 `thscodes` 显式取数时为 `null`；分页模式下为序列中最新有效时间。 |
| `total` | int | 全市场代码表总数（分页模式用于估算页数）。 |
| `item` | array | 快照记录列表。 |

`item[]` 为 `PriceSnapshotItem`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 带交易所后缀的完整 thscode，如 `600519.SH`。 |
| `ticker` | string | 纯代码（无后缀），如 `600519`。 |
| `last_price` | number | 最新成交价（原始货币）。 |
| `price_change` | number | 相对前收盘价的涨跌额。 |
| `price_change_ratio_pct` | number | 涨跌幅（百分比数值，如 `1.74` 表示 +1.74%）。 |
| `open_price` | number | 当日开盘价。 |
| `high_price` | number | 当日最高价。 |
| `low_price` | number | 当日最低价。 |
| `prev_price` | number | 前收盘价。 |
| `volume` | number | 成交量（股）。 |
| `turnover` | number | 成交额（原始货币）。 |

> **注意**：快照响应**不返回**标的中文名 `name`。需要中文名时配合 `/api/meta/tickers/search` 或 `/api/meta/tickers/list` 解析。

### 全市场分页规则

- 终止条件：当前页 `item` 数量小于 `limit`。
- 全市场快照属于大结果，应写入文件，只报告路径和行数。

### 避错要点

- 认证探测时省略 `thscodes`：意外拉取全市场，应指定单一 `thscode` 探测。
- 批量模式期望 `name`：快照不含名称字段。

---

## 2. 历史 K 线

```text
GET /api/a-share/prices/historical
```

获取单只标的的 A 股历史 K 线序列。**每次请求仅一个 thscode**，且时间窗口 ≤ 10 年。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscode` | query | string | 是 | 单只标的 thscode，**不接受逗号**。多标的请分多次请求。 | — |
| `interval` | query | string | 是 | K 线周期，当前仅支持 `1d`（日线）。 | `1d` |
| `start` | query | long | 是 | 起始时间，毫秒 Unix 时间戳。缺失返回 `code=1001`。 | — |
| `end` | query | long | 是 | 结束时间，毫秒 Unix 时间戳。`end - start` > 10 年返回 `code=1003`。 | — |
| `adjust` | query | string | 否 | 复权方式：`none` / `forward`（前复权）/ `backward`（后复权）。 | `forward` |
| `offset` | query | integer | 否 | 分页偏移。 | `0` |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/prices/historical?thscode=600519.SH&interval=1d&start=1716105600000&end=1747641600000&adjust=forward' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `HistoricalData`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 数据就绪时间（毫秒），为序列中最新一根 K 线的上游有效时间。 |
| `item` | array | K 线列表。 |

`item[]` 为 `PriceBarItem`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date_ms` | long | K 线日期（毫秒）。 |
| `open_price` | number | 开盘价。 |
| `high_price` | number | 最高价。 |
| `low_price` | number | 最低价。 |
| `close_price` | number | 收盘价。 |
| `volume` | number | 成交量（股）。 |
| `turnover` | number | 成交额（原始货币）。 |

### 避错要点

- 一次传多只股票：端点仅接受单个 `thscode`。
- 时间窗口 > 10 年：返回 `code=1003`，客户端需按 10 年切片分次请求。
- 传纯 6 位代码：必须带交易所后缀。

---

## 3. 复权因子事件流

```text
GET /api/a-share/corporate-actions/adjustment-factors
```

获取单只标的的 A 股复权因子事件流（现金分红 / 送股 / 配股）。**每次请求仅一个 thscode**。

返回原始事件流，供调用方自行推导复权因子。若只需复权后价格，直接调用历史 K 线端点并传 `adjust=forward|backward`。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscode` | query | string | 是 | 单只标的 thscode，**不接受逗号**。 | — |
| `from` | query | string | 否 | 事件起始日，格式 `YYYY-MM-DD`。 | — |
| `to` | query | string | 否 | 事件截止日，格式 `YYYY-MM-DD`。 | — |

### 请求示例

```bash
# 茅台全部历史复权事件
curl 'https://fuyao.aicubes.cn/api/a-share/corporate-actions/adjustment-factors?thscode=600519.SH' \
  -H 'X-api-key: <your-api-key>'

# 平安银行近 5 年事件
curl 'https://fuyao.aicubes.cn/api/a-share/corporate-actions/adjustment-factors?thscode=000001.SZ&from=2021-01-01&to=2026-01-01' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `AdjustmentFactorsData`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 带交易所后缀的完整 thscode。 |
| `ticker` | string | 纯代码（无后缀）。 |
| `item` | array | 事件列表，按 `ex_date_ms` 降序排列（最新在前）。 |

`item[]` 为 `AdjustmentFactorItem`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `ticker` | string | 纯代码。 |
| `ex_date_ms` | long | 除权除息日，Asia/Shanghai 00:00:00 毫秒 Unix 时间戳。 |
| `dividend_per_share` | number | 每股现金分红（税前，原始货币）。非现金事件为 `0`。 |
| `per_share_bonus` | number | 每股送股比例（如 `0.1` 表示 10 送 1）。纯现金分红事件为 `0`。 |

> **字段约定**：响应**不返回** `event_type` / `record_date` / `adjust_factor`。事件类型由 `dividend_per_share` 与 `per_share_bonus` 两个数值字段隐式区分：`dividend_per_share > 0` 为现金分红，`per_share_bonus > 0` 为送股。

### 避错要点

- 把事件流当作服务端已计算好的每日复权因子：事件流是原始事件，需调用方自行推导。
- 把月线写成 `1mo`：个股历史 K 线当前仅支持 `1d`。
- 一次传多只股票：端点仅接受单个 `thscode`。
