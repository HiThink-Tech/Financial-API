# marketdb Schema 参考

所有数据都在一个 DuckDB 文件里：`data/market.duckdb`（可用 `--db` 或 `$MARKETDB_DB_PATH` 覆盖）。schema 不大、相对稳定 —— 消费方应该写**视图**而不是原始表。

> **拿当前 schema 最快的方式**是 `marketdb describe --db data/market.duckdb` —— 一次 JSON 把每个对象的列、类型、行数、最大日期都吐出来。下面这些表只是概念地图。

## 分层

| 层 | 用途 | 是否易变 |
| --- | --- | --- |
| `raw_*` | 权威事实（来自 parquet 全量 + REST 增量合并） | 不变 —— 不原地覆写，幂等合并 |
| `calc_*` | 派生、可完全重建 | 易变 —— `rebuild-factors` 会重算 |
| `dim_*` | 维度 / 目录 | `sync-symbols` 刷新 |
| `stg_*` | 当前批次的临时落地表 | 每批清空 |
| `v_*` | 稳定的消费视图 | `rebuild-views` 重建；SQL 契约 |
| `_meta`, `_import_batches` | 版本 + 批次审计 | 仅追加 |

## 视图（稳定契约）

### `v_daily` —— 原始 OHLCV

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | VARCHAR | 同花顺代码，如 `300033.SZ` |
| `date` | DATE | 交易日 |
| `open` / `high` / `low` / `close` | DOUBLE | 不复权 |
| `volume` | DOUBLE | 成交量（股） |
| `turnover` | DOUBLE | 成交额（CNY） |
| `currency` | VARCHAR | A 股恒为 `CNY` |
| `interval` | VARCHAR | 日 K 恒为 `1d` |

### `v_daily_qfq` —— 前复权

形状同 `v_daily`，OHLC 各乘以 `forward_factor`（缺则用 1.0）。多一列：

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `forward_factor` | DOUBLE | 来自 `calc_adjust_factor_daily`，COALESCE 到 1.0 |

这是分析的默认视图 —— 最新价匹配真实市价，历史价缩放以吸收除权除息。

### `v_daily_hfq` —— 后复权

和 qfq 同形，多 `backward_factor`。历史价匹配真实，未来价上调。

### `v_symbol` —— 干净的标的目录

| 列 | 类型 |
| --- | --- |
| `thscode` | VARCHAR |
| `ticker` | VARCHAR |
| `name` | VARCHAR |
| `exchange` | VARCHAR（`SH` / `SZ` / `BJ`） |
| `asset_type` | VARCHAR（如 `a-share`） |
| `currency` | VARCHAR |

## 原始表

### `raw_kline_daily`

主键 `(thscode, date)`。导入时 `INSERT OR REPLACE`。这是不复权日 K 的权威事实表。

列：同 `v_daily`，多 `adjusted`（恒为 `none`）和 `source_batch_id`（外键 → `_import_batches.batch_id`）。

### `raw_adjustment_events`

主键 `(thscode, ex_date, event_id)`。除权除息 / 派息 / 送股事件。`calc_adjust_factor_daily` 的源数据。每个事件的载荷列包括 `dividend_per_share`、`per_share_bonus`、`per_share_transfer` 等 —— 哪列非零就是哪种事件。

## 计算表

### `calc_adjust_factor_daily`

日频前 / 后复权因子。PK `(thscode, date)`。完全由 `raw_adjustment_events` + 交易日历推导，`marketdb rebuild-factors` 会清掉重算。被 `v_daily_qfq` / `v_daily_hfq` join 进来。

## 维度

### `dim_symbol`

`marketdb sync-symbols` 从 REST `/api/meta/tickers/list` 填。首次 sync 之前是空的 —— 很多"没数据"的现象其实是这里没填。`update-daily` 也靠它知道要拉哪些 code。

## 暂存表

`stg_kline_daily`、`stg_symbols` … —— 每批开头清空。一般属于实现细节，别直接查。

## 元表

### `_meta`

键值存储。常见 key：

- `schema_version` —— 必须和 `marketdb._version.SCHEMA_VERSION` 一致；不一致会在 `MarketDB(...)` 构造时抛错
- `project_version` —— 上次写库的包版本
- `last_kline_daily_batch_id` —— 最近的导入 / 更新批次 id

### `_import_batches`

仅追加的审计日志：`batch_id`、`source`（`parquet` / `rest`）、`kind`、`started_at`、`finished_at`、`row_count`、`notes`。

## 程序化探查 schema

```bash
marketdb describe --db data/market.duckdb > /tmp/schema.json
jq '.objects | to_entries[] | {name: .key, kind: .value.kind, rows: .value.row_count, max_date: .value.max_date}' /tmp/schema.json
```

Python 端：

```python
import json, subprocess
schema = json.loads(subprocess.check_output(
    ["marketdb", "describe", "--db", "data/market.duckdb"]
))
for name, obj in schema["objects"].items():
    print(name, obj["kind"], obj["row_count"], obj.get("max_date"))
```

源 SQL：`marketdb/sql/schema.sql` 和 `marketdb/sql/views.sql`。

## thscode 约定

同花顺格式：`<6 位代码>.<交易所后缀>`。后缀：

| 后缀 | 交易所 |
| --- | --- |
| `.SH` | 上海证券交易所（主板、科创板 688） |
| `.SZ` | 深圳证券交易所（主板 000、中小 002、创业板 300） |
| `.BJ` | 北交所 |

常见坑：

- `300033` 单独写，API 无法消歧；务必用完整 `300033.SZ`。
- ST / *ST / 退市 标的在原始历史里仍会出现；只想要活的标的就 join `dim_symbol` 过滤。
