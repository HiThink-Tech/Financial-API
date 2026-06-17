# marketdb Python SDK 参考

```python
from marketdb import MarketDB
```

SDK 是 DuckDB 连接的薄外壳。所有方法返回 `pandas.DataFrame`。连接开销很小：一个会话用一个长连接，或者用上下文管理器都行。

## 构造

```python
# 长连接
db = MarketDB("data/market.duckdb")
...
db.close()

# 上下文管理器（推荐）
with MarketDB.open("data/market.duckdb") as db:
    df = db.get_daily("300033.SZ", start="2025-06-12", adjust="forward")
```

`MarketDB(db_path, *, check_schema=True)`。`check_schema=False` 仅在你明确知道本地 schema 版本和包不一致、且想强行打开时用，一般保持默认。

## get_daily

```python
def get_daily(
    thscode: str | Iterable[str],
    *,
    start: str | None = None,    # "YYYY-MM-DD" 包含
    end:   str | None = None,    # "YYYY-MM-DD" 包含
    adjust: str = "none",        # "none" | "forward" | "backward"
) -> pd.DataFrame
```

单股或批量。批量模式走一条 `WHERE thscode IN (?, ?, …)` SQL —— 比循环单股快得多。重复 code 会去重保序。结果按 `(thscode, date)` 排好。

```python
# 单股
df = db.get_daily("300033.SZ", start="2025-06-12", end="2026-06-12", adjust="forward")

# 批量
basket = db.get_daily(
    ["300033.SZ", "600519.SH", "000001.SZ"],
    start="2025-06-12", adjust="forward",
)
by_code = {c: g.reset_index(drop=True) for c, g in basket.groupby("thscode")}
```

返回列（qfq 视图，默认 `EXCLUDE (currency, interval)`）：
`thscode, date, open, high, low, close, volume, turnover, forward_factor`

要拿回去掉的列？走 `db.query_sql("SELECT * FROM v_daily_qfq WHERE ...")`。

## get_panel

```python
def get_panel(
    *,
    start: str | None = None,
    end:   str | None = None,
    adjust: str = "none",
    exchange: str | None = None,    # "SH" | "SZ" | "BJ"（按 thscode 后缀过滤）
) -> pd.DataFrame
```

全市场日期范围内的截面。不带 `thscode` 过滤 —— DuckDB 一次顺序扫视图，做因子研究、排序、回归时最快。按 `(date, thscode)` 排好。

```python
panel  = db.get_panel(start="2025-06-12", end="2026-06-12", adjust="forward")
sh_only = db.get_panel(start="2025-06-12", adjust="forward", exchange="SH")

# 宽表（每列一只票）
close_wide = panel.pivot(index="date", columns="thscode", values="close")
vol_wide   = panel.pivot(index="date", columns="thscode", values="volume")
```

经验规则：N（标的数）> ~200 或要"全市场" → 用 `get_panel`，比拼很长的 `IN (...)` 更快也更省。N < 100 用 `get_daily(list, ...)` 就够。

## get_symbols

```python
def get_symbols(*, exchange: str | None = None, asset_type: str | None = None) -> pd.DataFrame
```

读 `v_symbol`（来自 `dim_symbol`，由 `marketdb sync-symbols` 填）。没同步过 symbols 这里就是空的。

```python
syms = db.get_symbols(exchange="SH", asset_type="a-share")
```

## get_adjustment_events / get_adjustment_factors

```python
events  = db.get_adjustment_events("300033.SZ")    # 原始事件（除权除息派现等）
factors = db.get_adjustment_factors("300033.SZ")   # 日频前 / 后复权因子
```

校验复权计算、或者从 qfq 反推 raw 价的时候用。

## query_sql

```python
def query_sql(sql: str, params: list | None = None) -> pd.DataFrame
```

透传 SQL 逃生口。`get_daily` / `get_panel` 覆盖不到的查询形态（窗口函数、join `dim_symbol`、自定义聚合 …）走这里。

```python
df = db.query_sql("""
    SELECT thscode,
           AVG(turnover) FILTER (WHERE date >= ?) AS adv20,
           MAX(close) FILTER (WHERE date >= ?) AS hi20
    FROM v_daily_qfq
    WHERE date >= ?
    GROUP BY thscode
    ORDER BY adv20 DESC
    LIMIT 50
""", ["2026-05-12", "2026-05-12", "2026-05-12"])
```

要拿原生 `duckdb.DuckDBPyConnection`（例如走 Arrow 零拷贝），用 `db.connection`。

## export_csv

```python
path = db.export_csv("300033.SZ", "out/300033_qfq.csv", adjust="forward")
```

`get_daily` + `DataFrame.to_csv` 的便捷封装。暂不支持日期范围 —— 导出全历史。

## 性能笔记

- `get_daily(N codes)` 一条 SQL 带长度 N 的 `IN` 列表，开销随 N 和日期范围线性，不会 N²。
- `get_panel` 没有 `thscode` 谓词，DuckDB 顺序扫视图。"全市场 1 年前复权"走这条路最快。
- 视图里复杂的是 `LEFT JOIN calc_adjust_factor_daily`（qfq / hfq 需要）。该 join 成本和 N 无关，结果集越大越摊薄。
- 100 万行以上时 `.df()`（→ pandas）往往是瓶颈。要直接落 parquet 用 `db.connection.execute(sql).arrow()` + `pyarrow.parquet.write_table` 跳过 pandas。

```python
# Arrow 零拷贝落 parquet（跳过 pandas）
import pyarrow.parquet as pq
tbl = db.connection.execute(
    "SELECT * EXCLUDE (currency, interval) FROM v_daily_qfq WHERE date >= ?",
    ["2026-01-01"],
).arrow()
pq.write_table(tbl, "out/panel_2026.parquet")
```

## 错误模型

| 异常 | 原因 |
| --- | --- |
| `ValueError("adjust must be ...")` | `adjust` 不是 `none` / `forward` / `backward` |
| `RuntimeError("schema version mismatch ...")` | DB 是其他版本的包建的；用 `bootstrap.sh` 重建 |
| `duckdb.IOException` | DB 文件不存在 / 被锁；检查 `data/market.duckdb` 是否存在、是否被别的进程占着 |
| `duckdb.CatalogException` | 视图 / 表缺失；跑 `marketdb init` 或 `rebuild-views` |
| `duckdb.BinderException` | 列名不存在；跑 `marketdb describe` 确认 schema |

## 与 toolkit/fuyao/ 的配合

两份 toolkit 职责互斥：

- **toolkit/marketdb**（本份）→ 本地历史、OHLCV、复权、面板、因子研究。
- **toolkit/fuyao** → 实时行情、财报（利润表 / 资产负债表 / 现金流量表）、上游事件。

典型组合流：`toolkit/fuyao` 拉来缺的 parquet / 财报，落本地 → `toolkit/marketdb` 做分析。
