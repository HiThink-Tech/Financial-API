# Financial-API

本仓库托管一个 **A 股结构化金融数据的统一取数与分析平台**：

- **本地 A 股行情数据库**（包名 `marketdb`，Python + DuckDB）—— 单文件 DuckDB 数据库，对外提供 CLI、SQL 视图、Python SDK 三种消费方式。
- **扶摇（fuyao.aicubes.cn）REST/MCP API toolkit** —— 取实时行情、财报、复权事件、标的目录等本地没有的数据；不绑定任何 AI 工具，CLI / Python 函数库 / MCP 三种方式都能用。
- **两份 toolkit 的统一入口** [`toolkit/`](toolkit/README.md) —— 决策树 + 职责边界，告诉你"想做 X 应该走本地还是走远端"。
- **可直接 `python3` 跑的端到端样例** [`examples/`](examples/README.md) —— 第一次上手从这里开始。

> **怎么用 toolkit？**
> 1. 读 [`toolkit/README.md`](toolkit/README.md) 的决策树，确认你的需求该走 marketdb（本地历史）还是 fuyao（远端实时）。
> 2. 进对应子目录的 README：本地查询看 [`toolkit/marketdb/`](toolkit/marketdb/README.md)，远端 API 看 [`toolkit/fuyao/`](toolkit/fuyao/README.md)。
> 3. 直接跑 CLI（`marketdb <cmd>` 或 `toolkit/fuyao/scripts/fuyao.py <cmd>`），或在 Python 里 `from marketdb import MarketDB` / `from fuyao_client import ...`。
> 4. AI agent 用户：把 `toolkit/` 目录交给 agent 作为上下文即可，无需额外适配。

## 项目布局

```
marketdb/                Python 包（CLI + SDK + 数据层）
toolkit/                 工具无关的随仓库 toolkit（AI agent / 人类的统一入口）
├── README.md            统一路由：决策树 + 职责边界
├── marketdb/            本地 DuckDB 查询 toolkit（历史 OHLCV、复权、面板）
└── fuyao/               扶摇远端 API toolkit（实时行情、财报、REST/MCP）
examples/                端到端使用样例（带可跑的 Python 脚本）
refer-to/                参考资料：API/MCP 文档、设计文档、全量 Parquet 数据
feature/                 迭代工作区（每个迭代一个日期目录）
tests/                   pytest 测试套件
pyproject.toml           包定义与依赖
.env.example             环境变量样例
```

> **从哪里开始？**
> - 第一次上手：先跑 `./bootstrap.sh` 初始化环境与数据库（详见下文[快速开始](#快速开始)），再跑 [`examples/`](examples/README.md) 里的 quickstart 脚本
> - 统一入口（决策树 + 两个 toolkit 的职责边界）：[`toolkit/README.md`](toolkit/README.md)
> - 本地查询历史数据：[`toolkit/marketdb/README.md`](toolkit/marketdb/README.md)
> - 调扶摇 API（实时行情、财报）：[`toolkit/fuyao/README.md`](toolkit/fuyao/README.md)

## Toolkit：两条取数路径

仓库提供两份 toolkit，覆盖"数据从哪来"的两条路径：本地 DuckDB 取历史，扶摇 API 取实时与目录类数据。每份 toolkit 自带 `README.md + docs/`（fuyao 还含 `scripts/`），纯文档 + 普通 Python 脚本，不依赖任何 AI 工具的自动加载机制，Claude Code / Codex / Cursor / 裸 CLI 都能直接用。

| Toolkit | 适用场景 | 入口 |
| --- | --- | --- |
| [`toolkit/marketdb/`](toolkit/marketdb/README.md) | 历史 OHLCV、复权、面板、因子研究、任意本地 SQL（数据已在 `data/market.duckdb` 里） | `marketdb` CLI + Python SDK |
| [`toolkit/fuyao/`](toolkit/fuyao/README.md) | 实时行情、财报、复权事件、标的目录、交易日历（本地没有的数据） | `toolkit/fuyao/scripts/fuyao.py` CLI + `fuyao_client` 函数库 |

两份 toolkit **职责互斥**：历史数据走 marketdb，远端 / 实时数据走 fuyao。完整决策树、5 条职责边界、4 个组合范式都写在 [`toolkit/README.md`](toolkit/README.md) 里。

给 AI agent 使用的关键约定：

- **大数据纪律**：大查询结果重定向到 `/tmp/*.json`，**不要**塞回会话上下文。
- **统一 JSON 输出**：`marketdb` 的 `status` / `validate` / `query` 都支持 `--json`；`marketdb describe` 永远输出 JSON；`fuyao.py` 默认 JSON。
- **Schema 自动探查**：`marketdb describe --db data/market.duckdb` 一次拿到所有 table / view / 列 / 类型 / 行数 / 最大日期。

## 数据文件来源

`refer-to/data/` 下的两份全量 Parquet（日 K + 复权事件）来自扶摇平台的 **市场数据导出（market dumps）**，
请到下面这个页面登录后下载：

- 文档与下载入口：<https://fuyao.aicubes.cn/docs/api-reference/market-dumps/>
- 需要的两类文件（文件名末尾 `YYYYMMDD` 为快照日期，`bootstrap.sh` 会自动选最新一份）：
  - `a_share_daily_k_1d_none_10y_<YYYYMMDD>.parquet`（≈ 943 万行日 K，全市场 10 年）
  - `a_share_adjustment_factors_event_none_all_<YYYYMMDD>.parquet`（≈ 5.2 万行复权事件）

下载后直接放入 `refer-to/data/` 即可，无需重命名。若文件缺失，`bootstrap.sh` 会在启动时打印提示并跳过导入步骤。

## 快速开始

```bash
# 一键初始化（安装包 + 拷贝 .env + 建库 + 导入 Parquet + 校验，幂等）
./bootstrap.sh
# 只做安装与建库、跳过导入： ./bootstrap.sh --no-import
# 强制重新导入 Parquet：     ./bootstrap.sh --force
```

> 注意：`bootstrap.sh` 默认是幂等的 —— 若 `raw_kline_daily` 已经有数据，导入步骤会**自动跳过**（仅会
> 重跑 `init` / `status` / `validate`）。两种触发重导的方式：
>
> 1. **自动检测**：若 `refer-to/data/` 下的 parquet 快照日期（文件名末尾 `YYYYMMDD`）**新于** DB 中的最大
>    交易日，脚本会交互式询问 `re-import now? [Y/n]`，回车默认 `Y` 直接重导；非交互式 shell（CI 等）会
>    跳过并提示用 `--force`。
> 2. **显式强制**：`./bootstrap.sh --force`，或先 `rm data/market.duckdb` 再跑一次。

或者按下面的步骤手动执行：

```bash
# 1. 安装（推荐虚拟环境）
python3 -m pip install -e .

# 2. 准备配置：拷贝 .env.example 为 .env，按需修改 API_KEY 与 BASE_URL
cp .env.example .env

# 3. 初始化 DuckDB 数据库
marketdb init --db data/market.duckdb

# 4. 从 Parquet 全量数据导入（约 943 万行日 K + 5.2 万行复权事件）
#    注意把 <YYYYMMDD> 替换为你实际下载的快照日期。
marketdb import-parquet \
  --db data/market.duckdb \
  --daily  "refer-to/data/a_share_daily_k_1d_none_10y_<YYYYMMDD>.parquet" \
  --events "refer-to/data/a_share_adjustment_factors_event_none_all_<YYYYMMDD>.parquet"

# 5. 校验与查询
marketdb status   --db data/market.duckdb
marketdb validate --db data/market.duckdb
marketdb query    --db data/market.duckdb \
                  --sql "SELECT date, close FROM v_daily_qfq WHERE thscode = '600519.SH' ORDER BY date DESC LIMIT 10"

# 6. 单标的导出
marketdb export --db data/market.duckdb --thscode 600519.SH --out out/600519_qfq.csv --adjust forward
```

## CLI 命令一览（`marketdb`）

| 命令 | 作用 |
| --- | --- |
| `init` | 建表 + 建视图 + 写 `_meta` |
| `import-parquet` | DuckDB `read_parquet` 直接落库 + 自动重算复权因子 |
| `rebuild-views` | 重建 `v_daily` / `v_daily_qfq` / `v_daily_hfq` / `v_symbol` |
| `rebuild-factors` | 重算 `calc_adjust_factor_daily` |
| `validate` | 8 项数据质量校验（行数、主键唯一、OHLC 合法…），支持 `--json` |
| `sync-symbols` | REST `/api/meta/tickers/list` 同步 `dim_symbol`（需要 `API_KEY`） |
| `update-daily` | 拉取近窗口日 K → staging → 幂等合并 → 重算因子 → 刷新视图；落后阈值守门 |
| `query` | 直接跑 SQL，支持 `--json` |
| `export` | 单标的 CSV 导出，支持 `--adjust none/forward/backward` |
| `status` | schema 版本、表行数、最大交易日，支持 `--json` |
| `describe` | 全 schema 转储（table / view / 列 / 类型 / 行数 / 最大日期），永远 JSON |

完整 CLI 参考：[`toolkit/marketdb/docs/cli.md`](toolkit/marketdb/docs/cli.md)。
扶摇 API 的 CLI 参考：[`toolkit/fuyao/README.md`](toolkit/fuyao/README.md)（9 个 capability，`fuyao.py <subcommand>` 形式）。

## Python SDK

```python
from marketdb import MarketDB

with MarketDB.open("data/market.duckdb") as db:
    df     = db.get_daily("600519.SH", start="2024-01-01", adjust="forward")  # 单股
    basket = db.get_daily(["600519.SH", "300033.SZ"], start="2025-06-12")     # 批量
    panel  = db.get_panel(start="2025-06-12", adjust="forward", exchange="SH") # 全市场截面
    events = db.get_adjustment_events("600519.SH")
```

完整 SDK 参考：[`toolkit/marketdb/docs/sdk.md`](toolkit/marketdb/docs/sdk.md)。

## 数据分层

| 层 | 表 / 视图 | 说明 |
| --- | --- | --- |
| raw | `raw_kline_daily`, `raw_adjustment_events` | 原始不复权日 K 与复权事件，权威事实表 |
| calc | `calc_adjust_factor_daily` | 全量日频前/后复权因子，可重建 |
| dim | `dim_symbol` | 标的目录 |
| stg | `stg_*` | 每次更新的临时落地表 |
| view | `v_daily`, `v_daily_qfq`, `v_daily_hfq`, `v_symbol` | 面向 SDK / 回测的稳定接口 |
| meta | `_meta`, `_import_batches` | 版本、批次记录 |

## 测试

```bash
python3 -m pytest tests/
```

当前 18 个用例覆盖 schema / Parquet 导入 / 数据质量 / 复权因子 / 新鲜度守门。

## Development History

<!-- FEATURE-ITERATION-LOG:START -->
| 时间 | 迭代内容 | 交付成果 | 相关迭代目录 |
| --- | --- | --- | --- |
| 2026-06-09 | 落地 Python + DuckDB 本地行情数据库 marketdb，完成全量 Parquet 导入（943 万行日 K + 5.2 万事件）、复权因子计算、前/后复权视图、REST 增量更新闭环、CLI/SDK 与 18 用例测试套件。 | 一份本地、可复现、可查询的 A 股全量日 K + 全量复权因子 DuckDB 数据库已落地。研究人员可以直接通过 CLI、SQL、`MarketDB` SDK 或 pandas 消费历史数据，避免直接依赖 API。 | `feature/2026-06-09-本地行情数据库与回测分析应用/` |
| 2026-06-12 | 落地工具无关的随仓库 toolkit `api-skill/`：把扶摇（fuyao.aicubes.cn）9 个 REST/MCP capability 本地函数化、参数化、错误码化，单一 README.md 入口 + docs/（5 份契约）+ scripts/（fuyao_client.py 函数库 + fuyao.py CLI）；本地 thscode 缓存 TTL 12h，长窗口自动 10y 切片；CLI 仅产 JSON 到 stdout，无 pyarrow 依赖；冒烟全部通过。 | 任何 AI 工具（Claude Code / Codex / Cursor / Windsurf / ChatGPT / 裸 CLI）都能用同一份 toolkit；用户克隆仓库即得，无工具专属耦合；MCP 用户按 `api-skill/docs/mcp-config.md` 一次配好官方托管端点。 | `feature/2026-06-12-fuyao-financial-api-skill/` |
<!-- FEATURE-ITERATION-LOG:END -->
