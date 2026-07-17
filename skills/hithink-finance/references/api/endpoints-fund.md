# 公募基金端点

> 基金基本资料、披露数据、净值、收益、持有人结构以及场内基金行情。先通过元信息端点把名称或代码消歧为带后缀的唯一 `thscode`。

## 公共参数与类型

需要 `fund_type` 的端点使用以下枚举：

| 值 | 含义 |
| --- | --- |
| `otc` | 场外公募基金，对应 `asset_type=fund-otc` |
| `exchange` | 场内 ETF/LOF，对应 `fund-etf` 或 `fund-lof` |
| `reits` | 公募 REITs，对应 `fund-reits` |

`fund_type` 与 `thscode` 共同定位基金，不能传逗号分隔的多个 `fund_type`。场内行情端点不接收 `fund_type`，由服务端按 `thscode` 识别 ETF/LOF。

## 1. 基金基本资料

```text
GET /api/fund/profile/detail
```

参数：`fund_type`（必填）和单个 `thscode`（必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/profile/detail?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data` 为 `{timestamp, item[]}`，`item[]` 字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 基金唯一代码。 |
| `ticker` | string | 不带市场后缀的基金代码。 |
| `fund_name` | string/null | 基金名称。 |
| `estab_date` | integer/null | 成立日期，毫秒 Unix 时间戳。 |
| `mgmt_name` | string/null | 基金管理人名称。 |
| `manager_name` | string/null | 基金经理名称。 |

### 避错要点

- 不要仅凭 `.OF`/`.SH` 后缀猜 `fund_type`；先查元信息的 `asset_type`。
- 可选资料字段可能为 `null`，不得补写虚构管理人或成立日。

## 2. 基金定期披露重仓股

```text
GET /api/fund/portfolio/holdings
```

参数：`fund_type`（必填）和单个 `thscode`（必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/portfolio/holdings?fund_type=exchange&thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段：`thscode`、`ticker`、`stock_name`、`hold_ratio`。`hold_ratio=8.88` 表示 8.88%，不是 0.0888。

### 避错要点

- 该端点是定期披露持仓，不是实时组合；回答中应注明披露口径和返回时间。
- 暂无可用披露时返回 `code=3002`，不要用相近基金或模拟持仓替代。

## 3. 基金净值

```text
GET /api/fund/performance/nav
```

| 参数 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| `fund_type` | string | 是 | `otc` / `exchange` / `reits`。 | — |
| `thscode` | string | 是 | 单个基金代码。 | — |
| `range` | string | 否 | `week` / `month` / `tmonth` / `hyear` / `year` / `twoyear` / `tyear` / `fyear`。省略时只返回最新点。 | — |
| `nav_type` | string | 否 | `unit` / `adj` / `unit,adj`。 | `unit,adj` |

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/nav?fund_type=otc&thscode=025480.OF&range=year&nav_type=unit%2Cadj' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段为 `nav_date`、`unit_nav`、`adj_nav`。未选择的净值类型不出现在响应中；字段为空也不自动补零。

### 避错要点

- `range` 不是自然日期区间；不要传 `YYYY-MM-DD`。
- `nav_type=unit,adj` 含逗号，手写 URL 时应正确编码。

## 4. 基金区间收益

```text
GET /api/fund/performance/returns
```

参数：`fund_type`（必填）和单个 `thscode`（必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/returns?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段：

| 字段 | 口径 |
| --- | --- |
| `return_month` | 近一月 |
| `return_tmonth` | 近三月 |
| `return_hyear` | 近半年 |
| `return_year` | 近一年 |
| `return_tyear` | 近三年 |
| `return_fyear` | 近五年 |
| `return_nowyear` | 今年以来 |
| `return_now` | 成立以来 |

### 避错要点

- 收益字段来自不同固定区间，不能把它们当成自定义起止日期收益。
- 收益数据未准备好时返回 `3002`；不要据此宣称基金收益为零。

## 5. 基金持有人结构

```text
GET /api/fund/holders/detail
```

参数：`fund_type`（必填）和单个 `thscode`（必填）。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/holders/detail?fund_type=otc&thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段：`ins_position`（机构持有占比）、`holder_amount`（持有人数量）、`avg_holder_share`（户均份额）、`psnl_rate`（个人持有占比）、`mgmt_staff_hold_rate`（管理人员工持有占比）。

### 避错要点

- 持有人数据是披露数据，不是实时账户统计。
- 百分比字段按上游百分数值解释，缺失值保持 `null`。

## 6. 场内基金行情快照

```text
GET /api/fund/market/snapshot
```

参数：单个 `thscode`（必填）。支持 ETF 和 LOF；场外基金或 REITs 不支持时返回 `3004`。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/market/snapshot?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

`data.item[]` 字段：`thscode`、`ticker`、`last_price`、`open_price`、`high_price`、`low_price`、`prev_price`、`price_change_ratio_pct`、`price_change`、`price_amplitude_ratio_pct`、`volume`、`turnover`、`turnover_ratio_pct`。

### 避错要点

- 单次只接收一个 `thscode`，逗号分隔批量代码返回 `1002`。
- 场外基金没有交易所实时行情；先看 `asset_type`，不要盲目重试 `3004`。

## 7. ETF 历史日线行情

```text
GET /api/fund/market/historical
```

| 参数 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- |
| `thscode` | string | 是 | 单个 ETF `thscode`。 | — |
| `interval` | string | 否 | 当前只支持 `1d`。 | `1d` |
| `start` | integer | 是 | 起始毫秒 Unix 时间戳。 | — |
| `end` | integer | 是 | 结束毫秒 Unix 时间戳；不得早于 `start`。 | — |

单次 `[start,end]` 最多 5 年。LOF、场外基金和 REITs 不支持该历史行情能力时返回 `3004`。

```bash
curl 'https://fuyao.aicubes.cn/api/fund/market/historical?thscode=510300.SH&interval=1d&start=1704038400000&end=1735660799000' \
  -H 'X-api-key: <your-api-key>'
```

`data` 为 `{timestamp, thscode, interval, item[]}`；基金历史行情不提供 `adjust`。`item[]` 字段为 `date_ms`、`open_price`、`high_price`、`low_price`、`close_price`、`volume`、`turnover`。

### 避错要点

- 不要传复权参数；ETF 历史端点没有 `adjust`。
- 超过 5 年时拆成不重叠窗口，合并后按 `date_ms` 去重排序。
- 不要把 LOF 快照可用误解为 LOF 历史也可用；历史当前仅 ETF。

## 基金专用错误语义

| `code` | 含义 | 调用方处理 |
| --- | --- | --- |
| `3001` | 未找到对应基金 | 先用 meta 搜索核对 `fund_type`、`asset_type` 与 `thscode`。 |
| `3002` | 数据尚未准备 | 保留 `request_id` 和数据口径，稍后再查；不得补零或用模拟数据。 |
| `3004` | 目标基金类型不支持该能力 | 改用适用于该 `asset_type` 的端点，不重试原请求。 |
