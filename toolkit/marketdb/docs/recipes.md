# marketdb 配方集

常见场景的可直接拷的代码片段。前提：`data/market.duckdb` 已经存在（先跑 `./bootstrap.sh`）。

## 1. 单股近 N 天，拿来分析

```python
from datetime import date, timedelta
from marketdb import MarketDB

with MarketDB.open("data/market.duckdb") as db:
    end = date.today()
    start = end - timedelta(days=365)
    df = db.get_daily("300033.SZ", start=str(start), end=str(end), adjust="forward")
print(df.tail())
```

或者 CLI：

```bash
marketdb query --json --db data/market.duckdb --limit 0 --sql "
  SELECT date, open, high, low, close, volume
  FROM v_daily_qfq
  WHERE thscode = '300033.SZ' AND date >= '2025-06-12'
  ORDER BY date
" > /tmp/300033.json
```

## 2. 一篮子票（watchlist），对齐成宽表

```python
codes = ["300033.SZ", "600519.SH", "000001.SZ", "002594.SZ"]
panel = db.get_daily(codes, start="2025-06-12", adjust="forward")
close_wide = panel.pivot(index="date", columns="thscode", values="close")
returns    = close_wide.pct_change().dropna(how="all")
```

## 3. 全市场 1 年面板（因子研究）

```python
panel = db.get_panel(start="2025-06-12", end="2026-06-12", adjust="forward")
# 约 120 万行，pandas 约 150 MB。要省内存看下面的 Arrow 路径。
```

Arrow 零拷贝版本 —— 下游要直接落 parquet / polars / pyarrow 时最佳：

```python
import pyarrow.parquet as pq
tbl = db.connection.execute(
    "SELECT * EXCLUDE (currency, interval) FROM v_daily_qfq WHERE date BETWEEN ? AND ?",
    ["2025-06-12", "2026-06-12"],
).arrow()
pq.write_table(tbl, "out/panel_2025-2026.parquet")
```

## 4. 日均成交额（ADV）+ 20 日新高（一条 SQL 走全市场）

```python
df = db.query_sql("""
    WITH x AS (
      SELECT thscode, date, close, turnover,
             AVG(turnover) OVER w20 AS adv20,
             MAX(high)     OVER w20 AS hi20
      FROM v_daily_qfq
      WHERE date BETWEEN ? AND ?
      WINDOW w20 AS (PARTITION BY thscode ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)
    )
    SELECT *
    FROM x
    WHERE date = (SELECT MAX(date) FROM v_daily_qfq)
    ORDER BY adv20 DESC
    LIMIT 100
""", ["2026-05-01", "2026-06-12"])
```

## 5. 近 5 个交易日内的领涨股

```bash
marketdb query --json --db data/market.duckdb --limit 20 --sql "
  WITH first_last AS (
    SELECT thscode,
           FIRST_VALUE(close) OVER (PARTITION BY thscode ORDER BY date) AS c0,
           LAST_VALUE(close)  OVER (PARTITION BY thscode ORDER BY date
                                    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS c1
    FROM v_daily_qfq
    WHERE date >= (SELECT MAX(date) FROM v_daily_qfq) - INTERVAL 7 DAY
  )
  SELECT DISTINCT thscode, (c1 / c0 - 1) AS ret5d
  FROM first_last
  ORDER BY ret5d DESC
"
```

## 6. 每日增量更新（cron 友好）

```bash
# .env 里需要有 API_KEY + BASE_URL
marketdb sync-symbols  --db data/market.duckdb       # 偶尔 / 每周一次
marketdb update-daily  --db data/market.duckdb       # 每天收盘后
```

crontab（工作日收盘后）：

```
30 17 * * 1-5 cd /path/to/Financial-API && \
  marketdb update-daily --db data/market.duckdb >> logs/update.log 2>&1
```

落后超过 `MARKETDB_MAX_LAG_TRADING_DAYS`（默认 7）时 `update-daily` 会拒绝，让你重导 parquet：

```bash
# 把新 parquet 放进 refer-to/data/，然后：
./bootstrap.sh        # 自动检测新快照，交互式询问是否重导
# 或
./bootstrap.sh --force
```

## 7. 复权计算合不合（自检）

```python
events  = db.get_adjustment_events("300033.SZ")
factors = db.get_adjustment_factors("300033.SZ")
raw     = db.get_daily("300033.SZ", start="2024-01-01", adjust="none")
qfq     = db.get_daily("300033.SZ", start="2024-01-01", adjust="forward")

# qfq.close 应该等于 raw.close * forward_factor（按 date 对齐）
merged = raw.merge(factors, on=["thscode", "date"]).merge(qfq[["date","close"]].rename(columns={"close":"qfq_close"}), on="date")
merged["check"] = (merged["close"] * merged["forward_factor"]).round(4) == merged["qfq_close"].round(4)
print(merged["check"].value_counts())
```

## 8. 跨 toolkit 组合：用远端 API 刷财报，再用 marketdb 分析

```bash
# 用 toolkit/fuyao 拉最新的利润表（同仓库自带）
python3 toolkit/fuyao/scripts/fuyao.py financials-income --thscode 300033.SZ --limit 5 > /tmp/300033_income.json

# 和本地行情拼起来
python3 - <<'PY'
import json, pandas as pd
from marketdb import MarketDB

inc = pd.DataFrame(json.load(open("/tmp/300033_income.json")))
with MarketDB.open("data/market.duckdb") as db:
    px = db.get_daily("300033.SZ", start="2020-01-01", adjust="forward")
print(inc[["report_date","net_profit"]].tail())
print(px[["date","close"]].tail())
PY
```

## 9. 推掉本地 DB 重来

```bash
rm data/market.duckdb
./bootstrap.sh          # 从 refer-to/data/ 下最新 parquet 重建
```

## 10. 查 DB 现状（给 AI agent 用）

```bash
marketdb status   --json --db data/market.duckdb
marketdb describe       --db data/market.duckdb | jq '.objects | keys'
marketdb describe       --db data/market.duckdb | jq '.objects.v_daily_qfq.columns'
marketdb validate --json --db data/market.duckdb
```

会话开头这四条一起跑：确认 DB 在、了解 schema、跑质量校验，然后开始查数据。
