# toolkit/marketdb

随仓库附带的**本地 A 股行情数据库**（`marketdb`，Python + DuckDB）的工具无关 toolkit。**用于查询本地历史 OHLCV、复权数据、做面板 / 因子分析。要拉实时行情或财报请走 [`../fuyao/`](../fuyao/README.md)。**

本目录是任何使用者（人或 AI agent：Claude Code / Codex / Cursor / ChatGPT / CI 脚本 / Jupyter …）**读、更新、分析本地行情数据时的入口**。它只放文档，真正的能力面在：

- `marketdb` CLI —— 由 `pip install -e .`（或 `./bootstrap.sh`）安装。给 agent 用时统一加 `--json`。
- `marketdb.MarketDB` Python SDK —— `from marketdb import MarketDB`。
- DuckDB 视图 `v_daily` / `v_daily_qfq` / `v_daily_hfq` / `v_symbol` —— 原始 SQL 走 `marketdb query` 或 `db.query_sql(...)`。

**本目录刻意不放任何自动触发文件**（没有 SKILL.md / AGENTS.md / .cursorrules）。各 AI 工具的对接方式见文末"如何接入各 AI 工具"一节。

---

## 什么时候用

AI agent 读到本文件后，匹配以下关键词时应该触发：

- 本地 A 股行情 / 历史 K 线 / 日线 / OHLCV
- 复权 / 前复权 / 后复权 / qfq / hfq / 复权因子
- 增量更新 / update-daily / 补当天数据
- 全市场截面 / panel / 因子研究 / 选股回测
- thscode 形态的代码：`600519.SH`、`300033.SZ`、`000001.SZ` …
- 直接 SQL 查 DuckDB / `data/market.duckdb`

**不要**触发：实时盘口、tick 级数据、海外行情、宏观指标、基本面财报（财报走 [`toolkit/fuyao/`](../fuyao/README.md)）。

## 决策树（先看这里）

| 你想做什么 | 用什么 | 一行命令 / 代码 |
| --- | --- | --- |
| 一只票最近一段历史 | SDK `get_daily` | `db.get_daily("300033.SZ", start="2025-06-12", adjust="forward")` |
| 一篮子票（几十只） | SDK `get_daily(list)` | `db.get_daily(["300033.SZ", "600519.SH"], start=...)` |
| 全市场 / 单交易所截面 | SDK `get_panel` | `db.get_panel(start="2025-06-12", adjust="forward", exchange="SH")` |
| 任意 SQL（含 JOIN / 聚合） | CLI `query --json` 或 `db.query_sql` | `marketdb query --json --sql "SELECT date, AVG(close) FROM v_daily_qfq WHERE ..."` |
| 单股 CSV 落盘 | CLI `export` | `marketdb export --thscode 300033.SZ --out out/300033.csv --adjust forward` |
| 当天 / 最近几天补数据 | CLI `update-daily` | `marketdb update-daily --db data/market.duckdb` |
| 落后太久 / 直接全量重建 | `bootstrap.sh` | 下载最新 parquet → `./bootstrap.sh`（自动检测）或 `./bootstrap.sh --force` |
| 看 DB 当前状态 | CLI `status --json` | `marketdb status --json --db data/market.duckdb` |
| 自动探查 schema | CLI `describe` | `marketdb describe --db data/market.duckdb` |
| 数据质量校验 | CLI `validate --json` | `marketdb validate --json --db data/market.duckdb` |

如果只能记一件事：**先跑 `marketdb describe --db data/market.duckdb` 把 schema 拿到，再从结果里挑视图，然后 `query` / `get_daily` / `get_panel` 开干。**

---

## 准备工作（任何调用前都得先做）

```bash
./bootstrap.sh                   # 安装包 + 建库 + 导入 parquet
# 如果包已经装好：
marketdb status --db data/market.duckdb
```

DB 缺失或太旧时，两条路径（完整流程见 [`../README.md#数据文件来源`](../README.md)）：

1. **本地有更新的 parquet** → 重跑 `./bootstrap.sh`，它会检测到新快照并询问是否重导。
2. **REST 增量** → `marketdb update-daily --db data/market.duckdb`（需要 `.env` 里配好 `API_KEY`）。

`update-daily` 在本地落后超过 `MARKETDB_MAX_LAG_TRADING_DAYS`（默认 7 个交易日）时会拒绝运行，提示回到路径 1。

---

## 三种接入方式

### Pattern A —— Python SDK（调用方能跑 Python 时首选）

```python
from datetime import date, timedelta
from marketdb import MarketDB

with MarketDB.open("data/market.duckdb") as db:
    # 单股近一年（前复权）
    end = date.today()
    df = db.get_daily(
        "300033.SZ",
        start=str(end - timedelta(days=365)),
        end=str(end),
        adjust="forward",
    )

    # 批量（去重保序），一条 SQL IN (...) —— 比 N 次单股快很多
    basket = db.get_daily(
        ["300033.SZ", "600519.SH", "000001.SZ"],
        start="2025-06-12",
        adjust="forward",
    )
    by_code = {c: g.reset_index(drop=True) for c, g in basket.groupby("thscode")}

    # 全市场截面（因子研究 / 排序 / 回归）—— 一次顺序扫描，最快路径
    panel = db.get_panel(start="2025-06-12", end="2026-06-12", adjust="forward")
    close_wide = panel.pivot(index="date", columns="thscode", values="close")

    # 任意 SQL，返回 pandas DataFrame
    sh_top = db.query_sql(
        """
        SELECT thscode, AVG(turnover) AS adv20
        FROM v_daily_qfq
        WHERE date >= ? AND thscode LIKE '%.SH'
        GROUP BY thscode
        ORDER BY adv20 DESC
        LIMIT 50
        """,
        ["2026-05-01"],
    )
```

默认列已去掉 `currency` / `interval`（A 股里是常量）。要拿回这两列就直接 `db.query_sql("SELECT * FROM v_daily_qfq WHERE ...")`。

复权因子查询（校验 / 反推用）：

```python
events  = db.get_adjustment_events("300033.SZ")    # 派息、送股、配股等事件
factors = db.get_adjustment_factors("300033.SZ")   # 日频前/后复权因子
```

完整 SDK 参考：[`docs/sdk.md`](docs/sdk.md)。

### Pattern B —— CLI（shell / CI / 非 Python 环境首选）

```bash
# DB 状态 —— 版本、行数、最大日期
marketdb status --json --db data/market.duckdb

# Schema 自动探查 —— 一次 JSON 拿到所有 table / view / 列 / 行数
marketdb describe --db data/market.duckdb > /tmp/marketdb-schema.json

# 数据质量校验
marketdb validate --json --db data/market.duckdb

# 任意 SQL → JSON
marketdb query --json --db data/market.duckdb \
  --sql "SELECT date, close FROM v_daily_qfq WHERE thscode='300033.SZ' ORDER BY date DESC LIMIT 5"

# 单股 CSV 导出
marketdb export --db data/market.duckdb \
  --thscode 300033.SZ --out out/300033_qfq.csv --adjust forward

# 增量更新（需要 API_KEY）
marketdb update-daily --db data/market.duckdb
marketdb update-daily --db data/market.duckdb --target 2026-06-12
```

`status` / `validate` / `query` 都支持 `--json`。JSON 只写 stdout，错误 / 提示走 stderr。退出码：`0` 成功 · `1` 校验失败 · `2` 缺 `API_KEY`（仅 REST 命令）。

完整 CLI 参考：[`docs/cli.md`](docs/cli.md)。

### Pattern C —— 直接打 DuckDB

任何 DuckDB CLI / Python `duckdb` / 其他 DuckDB 客户端都能直接读 `data/market.duckdb`。视图是稳定契约；原始表（`raw_kline_daily`、`calc_adjust_factor_daily` …）也能读，但可能被 `rebuild-factors` / `rebuild-views` 重建。

```bash
duckdb data/market.duckdb \
  "SELECT thscode, MAX(date) FROM v_daily_qfq GROUP BY thscode ORDER BY 2 DESC LIMIT 10"
```

---

## 能力矩阵

| SDK 函数 | CLI | 说明 |
| --- | --- | --- |
| `MarketDB.get_daily(code\|codes, start, end, adjust)` | `query --sql ...` / `export` | 单股或批量；批量走 `IN (...)`；按 (thscode, date) 排序 |
| `MarketDB.get_panel(start, end, adjust, exchange)` | `query --sql ...` | 全市场顺序扫描；做截面 / 因子的最薄路径 |
| `MarketDB.query_sql(sql, params)` | `query --json --sql ...` | 透传 SQL → DataFrame / JSON |
| `MarketDB.get_symbols(exchange, asset_type)` | `query --sql "SELECT * FROM v_symbol"` | 标的目录 |
| `MarketDB.get_adjustment_events(code)` | `query --sql ...` | 派息 / 送股等原始事件 |
| `MarketDB.get_adjustment_factors(code)` | `query --sql ...` | 日频前 / 后复权因子 |
| `MarketDB.export_csv(code, out, adjust)` | `export --thscode --out --adjust` | 单股 CSV |
| —— | `status --json` | schema 版本 + 行数 + 最大日期 |
| —— | `validate --json` | 8 项数据质量校验；出错退出码 1 |
| —— | `describe` | 全 schema 转储（table / view / 列 / 类型） |
| —— | `update-daily [--target YYYY-MM-DD]` | REST 增量合并 |
| —— | `sync-symbols` | 从 REST 刷 `dim_symbol` |
| —— | `init` / `rebuild-views` / `rebuild-factors` / `import-parquet` | 管道命令，一般 `bootstrap.sh` 帮你调 |

---

## 大数据纪律（AI agent 务必看）

**不要**把大查询结果整段塞回会话上下文。正确流程：

```
1) CLI/函数 → 把 stdout 重定向到 /tmp/<x>.json（或写到 data/、out/）
2) 把行数 + 文件路径报告回会话
3) 下游消费者（notebook、pandas）从文件读
```

当前数据规模参考：

- `raw_kline_daily` / `v_daily*`：约 945 万行（10 年 × 5000 只票）
- `calc_adjust_factor_daily`：约 945 万行
- `raw_adjustment_events`：约 5.2 万行
- 全市场 1 年面板 ≈ 120 万行，pandas 约 100–150 MB

经验法则：

- 单股 × 1 年 ≈ 250 行 → 直接打印没问题
- N 只 × 1 年，N ≤ 20 → `head()` 看看 OK
- 全市场或 N ≥ 100 → 落盘，回报 shape
- SQL 聚合后行数 < 1000 → 直接打印

`N > 200` 时优先用 `db.get_panel(...)` 而不是巨长的 `IN (...)` 列表 —— 更快，也避免 SQL 字符串爆炸。

---

## 错误模型与常见坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `marketdb: command not found` | 包没装 | `pip install -e .` 或 `./bootstrap.sh` |
| `data/market.duckdb` 不存在 | DB 没建过 | `./bootstrap.sh` |
| `update-daily` 报"落后超过阈值" | 本地 DB 落后 > 7 个交易日 | 下新 parquet → `./bootstrap.sh`，**或**把 `.env` 里的 `MARKETDB_MAX_LAG_TRADING_DAYS` 调大 |
| `update-daily` 报 `missing API_KEY` | `.env` 没配 | 在 `.env` 设 `API_KEY` + `BASE_URL` |
| `validate` 退出码 1 | 至少一项 error 级别校验失败 | `marketdb validate --json` 看 `issues[].detail` |
| `get_daily` 返回 0 行 | thscode 后缀不对（`SH` / `SZ`）或日期范围没数据 | 用 `db.get_symbols()` 或 `marketdb describe` 查 |
| `bootstrap.sh` 提示 "newer parquet snapshot detected" | `refer-to/data/` 下有更新的快照 | 回车 `Y` 重导，或加 `--force` 跑 |

复权语义提醒：

- `adjust="none"` → 不复权原始 OHLCV（权威事实表，对账用）
- `adjust="forward"`（前复权）→ 分析默认值，最新价对齐，历史价回调
- `adjust="backward"`（后复权）→ 历史价对齐，最新价上调（少用）

---

## Schema 速查

| 层 | 对象 | 说明 |
| --- | --- | --- |
| raw | `raw_kline_daily` | 不复权日 K 权威事实表 |
| raw | `raw_adjustment_events` | 复权事件（除权除息）权威事实表 |
| calc | `calc_adjust_factor_daily` | 日频前 / 后复权因子，`rebuild-factors` 可重算 |
| dim | `dim_symbol` | 标的目录（`sync-symbols` 来填） |
| view | `v_daily` | 不复权 + 干净列 |
| view | `v_daily_qfq` | 前复权 OHLC（含 `forward_factor`） |
| view | `v_daily_hfq` | 后复权 OHLC（含 `backward_factor`） |
| view | `v_symbol` | 干净的标的列表 |
| meta | `_meta`, `_import_batches` | schema 版本、批次记录 |

要程序化拿 schema（含类型、行数、最大日期）：`marketdb describe`。源 SQL：`marketdb/sql/views.sql`。详细文档：[`docs/schema.md`](docs/schema.md)。

---

## 如何接入各 AI 工具

各工具的自动加载机制不同，本 toolkit 只保留框架无关核心，对接方式各自加一层薄壳：

| 工具 | 怎么暴露这份 skill |
| --- | --- |
| Claude Code | 对话里说："本地行情走 `toolkit/marketdb/`，先读 `toolkit/marketdb/README.md`。"；或加项目级 `.claude/skills/marketdb/SKILL.md` 指向本文件 |
| Codex CLI / OpenAI Agents | 在仓库根加 `AGENTS.md`：本地 A 股数据走 `toolkit/marketdb/`，实时 API 走 `toolkit/fuyao/`。Codex 会自动读 |
| Cursor | `.cursor/rules/marketdb.mdc` 指向本 README；或把本 README 贴到项目 system prompt |
| Windsurf / Codeium | `.windsurf/rules/*.md` 同上 |
| ChatGPT（网页版） | 把本 `README.md` + `docs/sdk.md` + `docs/cli.md` 作为附件上传 |
| 任意 AI | 告诉模型"先读 `toolkit/marketdb/README.md`，再调 `marketdb` CLI 或 import `MarketDB`"，到这里就够了 |

对接文件刻意**不放**在本目录里 —— 谁需要谁自己加，保持 toolkit 最小化。

## Python 依赖

`./bootstrap.sh` 已经装好了。手动装：

```bash
pip install -e .
# 会带入：duckdb, pandas, typer, rich, requests, python-dotenv
```

## 维护

- Schema 改动 → 把 `marketdb/_version.py` 里的 `SCHEMA_VERSION` 升版，重跑 `init`（或 `bootstrap.sh`）。
- 新 parquet 快照 → 丢进 `refer-to/data/`，重跑 `bootstrap.sh`（自动检测）。
- 本地 DB 坏了 → `rm data/market.duckdb && ./bootstrap.sh`。

## 安全

- `API_KEY` 只通过 `.env` / 环境变量。不要贴到代码、提示词、commit 里。
- 本地 DuckDB 文件不含任何凭证，可信用户间在同一台机器上共享是安全的。
