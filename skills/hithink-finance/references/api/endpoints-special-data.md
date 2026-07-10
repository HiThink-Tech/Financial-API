# 特色数据端点

> A 股涨停股票池、连板天梯、当日个股异动、市场热榜与龙虎榜。参数定义、响应字段以本文档为准。

## 1. 涨停股票池

```text
GET /api/a-share/special-data/limit-up-pool
```

按交易日返回 A 股涨停 / 连板股票池。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `date_ms` | query | long | 否 | 交易日，Asia/Shanghai 00:00 毫秒戳。省略则取服务器今日。 | 今日 |
| `page` | query | integer | 否 | 页码，≥ 1。 | `1` |
| `size` | query | integer | 否 | 每页条数，1–200。 | `50` |
| `sort_field` | query | string | 否 | 排序字段，枚举 `last_price` / `continue_day_cnt` / `seal_money` / `limit_up_time`。 | `last_price` |
| `sort_dir` | query | string | 否 | 排序方向，枚举 `asc` / `desc`。 | `desc` |

> 后端池固定为全部连板 + `main,chinext,ssestar,north` 四类板块，不可配置。

### 请求示例

```bash
# 今日涨停池，按涨停时间排序
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-up-pool?sort_field=limit_up_time&sort_dir=asc&size=50' \
  -H 'X-api-key: <your-api-key>'

# 指定交易日
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-up-pool?date_ms=1718294400000&page=1&size=100' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, pagination, item[]}`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `pagination` | object | 分页信息：`{total, pages, size, page}`。 |
| `item` | array | 涨停股列表。 |

`item[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `name` | string | 股票名称。 |
| `is_st` | boolean | 是否 ST 股。 |
| `is_new` | boolean | 是否次新股。 |
| `last_price` | number | 最新价。 |
| `price_change_ratio_pct` | number | 涨跌幅（百分比数值）。 |
| `limit_up_time` | string | 涨停时间。 |
| `limit_up_reason` | string | 涨停原因。 |
| `continue_day_text` | string | 连板天数文本（如「2 连板」）。 |
| `continue_day_cnt` | integer | 连板天数。 |
| `seal_money` | number | 封单金额。 |
| `max_seal_money` | number | 最大封单金额。 |

### 避错要点

- 在非交易日期待报错：非交易日返回空集，不报错。
- 混用 `limit/offset` 分页：本端点使用 `page/size` 分页，不是 `limit/offset`。
- `sort_field` 传非枚举值：返回 `code=1002`。

---

## 2. 连板天梯

```text
GET /api/a-share/special-data/limit-up-ladder
```

返回近 30 个交易日的连板梯队矩阵。

### 请求参数

无入参。返回固定窗口矩阵。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-up-ladder' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, window, item[]}`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `window` | object | 窗口信息：`{length, date_list, board_caps}`。 |
| `item` | array | 按日期排列的连板矩阵。 |

`item[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date` | string | 日期。 |
| `boards` | object | 各梯队股票：`{two_board, three_board, four_board, five_board, six_board, seven_over}`。 |

> 每个 `boards.*` 最多返回 4 只股票；无该梯队时返回 `[]`。
> `boards.*[].seal_nextday` 在最近一个交易日为 `null`（无次日参考）。

`boards.*[]` 元素（每只股票，共 6 个字段）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `name` | string | 股票名称。 |
| `board_num` | integer | 连板天数。 |
| `sign_level` | string | 标记级别。 |
| `seal_nextday` | string \| null | 次日封板情况（最近交易日为 `null`）。 |

### 避错要点

- 期待逐股明细或自定义时间窗口：本端点返回固定 30 日矩阵，不支持自定义。
- 把缺失梯队当数据错误：无该梯队返回 `[]` 是正常行为。

---

## 3. 当日个股异动原因（列表）

```text
GET /api/a-share/special-data/anomaly-analysis-list
```

返回当日全市场个股异动原因。**仅 REST 端点，无对应 MCP 工具。**

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `tag_codes` | query | string | 否 | 异动标签，逗号分隔列表。省略或传空返回全量当日记录。 | — |

`tag_codes` 允许值（大小写不敏感，去重，OR 语义）：

| 标签 | 含义 |
| --- | --- |
| `LIMIT_UP` | 涨停 |
| `LIMIT_DOWN` | 跌停 |
| `SHARP_RISE` | 大幅上涨 |
| `SHARP_FALL` | 大幅下跌 |
| `RAPID_RALLY` | 快速反弹 |
| `RAPID_DECLINE` | 快速下跌 |

### 请求示例

```bash
# 全部当日异动
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/anomaly-analysis-list' \
  -H 'X-api-key: <your-api-key>'

# 仅涨停和跌停
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/anomaly-analysis-list?tag_codes=LIMIT_UP,LIMIT_DOWN' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`，仅返回当日快照：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `item` | array | 异动记录列表。 |

`item[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `stock_name` | string | 股票名称。 |
| `analysis_content` | string | 异动原因分析。 |
| `keyword_list` | array | 关键词列表。 |
| `thscode` | string | 完整 thscode。 |
| `tag_name` | string | 异动标签名称。 |

### 避错要点

- 空的 token（连续逗号 / 末尾逗号）或未知标签：返回 `code=1002`。
- 期待历史异动查询：本端点仅支持当日快照，不提供历史查询。

---

## 4. 当日个股异动原因（按标的）

```text
GET /api/a-share/special-data/anomaly-analysis-stock
```

按 1–50 个 thscode 批量查询当日个股异动原因。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscodes` | query | string | 是 | 1–50 个 thscode，逗号分隔。格式为 6 位数字 + `.SH`/`.SZ`/`.BJ`（后缀大小写不敏感，服务端归一化为大写）。 | — |

> 数量上限在去重前检查：传入 50 个原始 token（即使有重复）即达上限，超过返回 `code=1003`。

### 请求示例

```bash
# 单只股票异动原因
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/anomaly-analysis-stock?thscodes=600519.SH' \
  -H 'X-api-key: <your-api-key>'

# 批量查询
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/anomaly-analysis-stock?thscodes=600519.SH,000001.SZ,300750.SZ' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`，结构与 `anomaly-analysis-list` 一致，结果按去重后的输入顺序分组。

### 避错要点

- 传指数代码：本端点仅支持股票 thscode，不支持指数。
- 超过 50 个 token：返回 `code=1003`。
- 缺失 `thscodes`：返回 `code=1001`。

---

## 5. 飙升榜

```text
GET /api/a-share/special-data/skyrocket-list
```

返回 A 股飙升榜。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `period` | query | string | 否 | 统计周期，枚举 `day` / `hour`。 | `day` |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/skyrocket-list?period=day' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `item` | array | 飙升榜列表。 |

`item[]` 元素（共 7 个字段）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `name` | string | 股票名称。 |
| `rank` | integer | 排名。 |
| `heat` | number | 热度值。 |
| `rank_change` | integer | 排名变化。 |
| `rank_trend` | string | 排名趋势。 |

### 避错要点

- 把榜单排名当作无延迟交易信号：榜单数据有延迟，不构成交易信号。

---

## 6. 热股榜

```text
GET /api/a-share/special-data/hot-stock-list
```

返回当前热股榜。`day` 表示 24 小时榜。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `period` | query | string | 否 | 统计周期，枚举 `day` / `hour`。`day` 表示 24 小时榜。 | `day` |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/hot-stock-list?period=hour' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 结构与飙升榜一致：`{timestamp, item[]}`，`item[]` 字段相同（共 7 个字段：`thscode`、`ticker`、`name`、`rank`、`heat`、`rank_change`、`rank_trend`）。

### 避错要点

- 与飙升榜混淆：两者排名逻辑不同，`hot-stock-list` 是热股榜，`skyrocket-list` 是飙升榜。
- 忽略数据时间：注意 `timestamp` 表示的数据时间。

---

## 7. 历史热股榜

```text
GET /api/a-share/special-data/hot-stock-list-history
```

按指定日期返回历史热股排名。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `date` | query | string | 是 | 自然日，格式 `YYYY-MM-DD`，需在服务器最近一年窗口内。 | — |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/hot-stock-list-history?date=2025-06-30' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{date, date_ms, item[]}`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date` | string | 日期。 |
| `date_ms` | long | 日期毫秒戳。 |
| `item` | array | 热股排名列表。 |

`item[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `name` | string | 股票名称。 |
| `rank` | integer | 排名。 |

### 避错要点

- 用毫秒时间戳传 `date`：`date` 必须用 `YYYY-MM-DD` 字符串。
- 期待区间走势：本端点按单日返回，区间走势用 `hot-stock-rank-trend`。

---

## 8. 热股排名趋势

```text
GET /api/a-share/special-data/hot-stock-rank-trend
```

查询单只股票在日期区间内的热榜排名走势。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscode` | query | string | 是 | 单只 A 股 thscode。 | — |
| `start_date` | query | string | 是 | 起始日，`YYYY-MM-DD`，需在服务器最近一年窗口内。 | — |
| `end_date` | query | string | 是 | 结束日，`YYYY-MM-DD`，`start_date ≤ end_date`，区间 ≤ 1 年。 | — |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/hot-stock-rank-trend?thscode=600519.SH&start_date=2025-01-01&end_date=2025-06-30' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`，`timestamp` 为起始日 Asia/Shanghai 00:00 毫秒戳：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 起始日毫秒戳。 |
| `item` | array | 排名走势列表。 |

`item[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `date` | string | 日期。 |
| `date_ms` | long | 日期毫秒戳。 |
| `rank` | integer | 当日排名。 |

### 避错要点

- 一次传多只股票：端点仅接受单个 `thscode`。
- 把无排名日期误作接口缺失：某些日期可能无排名数据，属正常行为。

---

## 9. 龙虎榜

```text
GET /api/a-share/special-data/dragon-tiger-list
```

查询全部榜、机构榜或游资榜。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `board_type` | query | string | 否 | 榜单类型，枚举 `all` / `org` / `hot_money`。 | `all` |
| `date` | query | string | 否 | 交易日，`YYYY-MM-DD`。省略则取最新可用交易日；显式日期需为最近一年内的交易日。 | 最新交易日 |

### 请求示例

```bash
# 今日全部龙虎榜
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/dragon-tiger-list?board_type=all' \
  -H 'X-api-key: <your-api-key>'

# 指定日期游资榜
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/dragon-tiger-list?board_type=hot_money&date=2025-06-30' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, board_type, trade_date, count, stock_count, stock_items, hot_money_items}`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `board_type` | string | 榜单类型。 |
| `trade_date` | string | 交易日期。 |
| `count` | integer | 记录总数。 |
| `stock_count` | integer | 股票数量。 |
| `stock_items` | array | 个股明细列表。 |
| `hot_money_items` | array | 游资明细列表（`board_type=hot_money` 或 `all` 时返回）。 |

`stock_items[]` 元素（共 14 个字段）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `name` | string | 股票名称。 |
| `concept_list` | array | 概念列表。 |
| `change` | number | 涨跌幅。 |
| `buy_value` | number | 买入额。 |
| `sell_value` | number | 卖出额。 |
| `net_value` | number | 净额。 |
| `net_rate` | number | 净额占比。 |
| `org_net_value` | number | 机构净额。 |
| `hot_money_net_value` | number | 游资净额。 |
| `hot_rank` | integer | 热度排名。 |
| `range_days` | integer | 上榜天数。 |
| `limit_reason` | string | 涨跌停原因。 |

`hot_money_items[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 游资名称。 |
| `buying` | number | 买入额。 |
| `rows` | array | 该游资关联的股票明细列表。 |

`hot_money_items[].rows[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 thscode。 |
| `ticker` | string | 纯代码。 |
| `name` | string | 股票名称。 |
| `concept_list` | array | 概念列表。 |
| `change` | number | 涨跌幅。 |
| `amount` | number | 金额。 |
| `buy_value` | number | 买入额。 |
| `sell_value` | number | 卖出额。 |
| `net_value` | number | 净额。 |
| `net_rate` | number | 净额占比。 |
| `org_net_value` | number | 机构净额。 |
| `hot_money_net_value` | number | 游资净额。 |
| `hot_money_net_rate` | number | 游资净额占比。 |
| `hot_money_item_net_value` | number | 游资单项净额。 |
| `hot_money_item_net_rate` | number | 游资单项净额占比。 |
| `hot_rank` | integer | 热度排名。 |
| `range_days` | integer | 上榜天数。 |

### 避错要点

- 假设省略 `date` 一定等于今天：省略 `date` 时服务端取最新可用交易日，不一定是今天（非交易日时取前一交易日）。
- 显式传非交易日：需为最近一年内的交易日，非交易日无数据。
