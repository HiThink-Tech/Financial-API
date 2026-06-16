# toolkit/

本仓库的**两份工具无关 toolkit 的统一入口**。任何人或 AI agent 第一次进来，先读这一份，按下面的"决策树"路由到具体 toolkit。

```
toolkit/
├── README.md           ← 你正在读这里：决策树 + 职责边界
├── marketdb/           本地 DuckDB 查询 toolkit（历史数据）
└── fuyao/              同花顺金融数据 API toolkit（实时数据 / 财报）
```

两份 toolkit 都遵循同一套设计原则：

- **工具无关**：没有 SKILL.md / AGENTS.md / .cursorrules。各 AI 工具的对接方式见各自 README 末尾。
- **单一 README + docs/**：契约都在文档里，能力面是 marketdb 包（`pip install -e .`）或 `toolkit/fuyao/scripts/`。
- **大数据纪律**：大查询结果一律 stdout 重定向到 `/tmp/*.json`，**不要**塞回 AI 上下文。

---

## 决策树：我想做 X，应该去哪个 toolkit？

### 按"数据是否已在本地"分

| 情况 | 用哪个 |
| --- | --- |
| 数据已经在 `data/market.duckdb` 里 | [`toolkit/marketdb/`](marketdb/README.md) |
| 需要从远端 API 拉数据（本地没有 / 已经过期） | [`toolkit/fuyao/`](fuyao/README.md) |
| 不确定本地有没有 | 先跑 `marketdb describe --db data/market.duckdb`，看 `objects.raw_kline_daily.max_date` 够不够新 |

### 按"数据类型"分

| 数据类型 | 本地 (`marketdb`) | 远端 API (`toolkit/fuyao`) |
| --- | --- | --- |
| 历史日 K（10 年）| ✅ 主用 | 只在补缺时 |
| 复权因子 / 事件 | ✅ `calc_adjust_factor_daily` / `raw_adjustment_events` | ✅ 拉新事件用 |
| 实时盘后快照 | ❌（仅日终落库） | ✅ `prices-snapshot` |
| 利润表 / 资产负债表 / 现金流量表 | ❌ | ✅ `financials-*` |
| 标的目录（thscode → 名称） | ✅ `dim_symbol`（先 `sync-symbols`） | ✅ `tickers-list` |
| 交易日历 | ✅ 通过 `raw_kline_daily.date` 推导 | ✅ `calendar-trading-days` |
| 分钟 K / tick | ❌ | ❌（本仓库不覆盖） |

### 按"动作"分

| 我想… | 命令 / 函数 | 在哪 |
| --- | --- | --- |
| 拿一只票的近一年历史 | `db.get_daily("300033.SZ", start="...", adjust="forward")` | marketdb |
| 拿一篮子票 | `db.get_daily([...], start="...")` | marketdb |
| 拿全市场截面做因子研究 | `db.get_panel(start="...", end="...")` | marketdb |
| 跑任意 SQL | `marketdb query --json --sql ...` | marketdb |
| 看 DB 状态 / schema | `marketdb status --json` / `marketdb describe` | marketdb |
| 数据质量校验 | `marketdb validate --json` | marketdb |
| 增量补当天数据 | `marketdb update-daily` | marketdb（背后调远端 REST） |
| 全量重建 DB | `python bootstrap.py` | 仓库根 |
| 拉某只票的最新快照 | `fuyao.py prices-snapshot --thscodes 300033.SZ` | 远端 API |
| 拉某只票的财报 | `fuyao.py financials-income --thscode ...` | 远端 API |
| 把名字翻成 thscode | `fuyao.py tickers-search --q "贵州茅台"` | 远端 API |
| 查交易日历 | `fuyao.py calendar-trading-days` | 远端 API |

---

## 职责边界（避免打架）

为了让两份 toolkit 永远只解决各自的问题，约定如下规则：

1. **"历史 + 已对账的数据"永远走 marketdb**
   - 已经落入 `data/market.duckdb` 的 10 年日 K 是权威事实表（`raw_kline_daily`），不要再去打远端 REST 拉同一段时间的数据。
   - 复权因子用 `calc_adjust_factor_daily`（本地一次性算好），不要每次都重新算 / 重新拉事件。

2. **"实时 / 当天 / 财报 / 元数据"永远走远端 API**
   - 当天盘后的最新快照、最新一期财报、刚刚刷新的 thscode 列表 —— 这些本地没有，必须走远端 API。
   - 例外：`marketdb update-daily` 会**内部**调远端 REST 把新一两天的日 K 补进本地。这是唯一一处"marketdb → 远端 API"的内部调用。

3. **远端 API 不直接落地大文件**
   - 远端 API 的 CLI 只产 JSON 到 stdout。要落地 parquet / 入 marketdb，调用方负责（用 pandas 转一下，再走 `marketdb import-parquet`）。
   - 一次性大全量（10 年 + 全市场）不要打 REST —— 用 [全市场数据导出](https://fuyao.aicubes.cn/docs/api-reference/market-dumps/) 下 parquet，丢进 `refer-to/data/`，跑 `python bootstrap.py`。

4. **谁也不解决"分析 / 回测"问题**
   - 两份 toolkit 都只负责"把干净的数据交到你手上"。具体的 alpha 模型、回测引擎、画图，**不在** toolkit 里。
   - 真实的端到端样例放在 [`../examples/`](../examples/README.md)。

5. **不重复造文档**
   - 共有的"什么是 thscode、复权语义、A 股代码后缀"约定写在 marketdb 这一边（见 `toolkit/marketdb/docs/schema.md`）。
   - 远端 API 那边只描述协议 + 字段语义（见 `toolkit/fuyao/docs/llms-full.txt`）。
   - 两边都不展开"AI agent 怎么用 toolkit" —— 这条规则在本文件统一说。

---

## 典型组合流程

很多真实场景需要两份 toolkit 串起来用。组合范式：

### 范式 A：本地为主，远端补缺

```bash
# 1. 看本地够不够新
marketdb describe --db data/market.duckdb | jq '.objects.raw_kline_daily.max_date'

# 2. 落后了 → 增量补
marketdb update-daily --db data/market.duckdb

# 3. 做分析（全部本地）
python3 -c "
from marketdb import MarketDB
with MarketDB.open('data/market.duckdb') as db:
    panel = db.get_panel(start='2025-06-12', adjust='forward')
    print(panel.shape)
"
```

### 范式 B：用远端 API 拿元数据 + 本地查行情

```bash
# 用远端 API 把"贵州茅台"翻成 thscode
THSCODE=$(python3 toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台" | jq -r '.[0].thscode')

# 用本地查历史
marketdb query --json --db data/market.duckdb --sql "
  SELECT date, close FROM v_daily_qfq WHERE thscode = '$THSCODE'
  ORDER BY date DESC LIMIT 30
"
```

### 范式 C：拿财报 + 拼本地行情做基本面研究

见 [`../examples/03_fundamentals_join.py`](../examples/README.md)。

### 范式 D：全量重建

```bash
# 当本地落后太久（> MARKETDB_MAX_LAG_TRADING_DAYS）
# 不要用远端 REST —— 直接去全市场数据导出下 parquet
# 放进 refer-to/data/，然后：
python bootstrap.py    # 自动检测新快照
```

---

## Auth

| toolkit | 需要 token？ |
| --- | --- |
| `marketdb` | ❌ 纯本地，不需要 |
| `toolkit/fuyao` | ✅ `export FUYAO_TOKEN=<token>`，在 https://fuyao.aicubes.cn/admin 签发 |
| `marketdb update-daily` / `sync-symbols` | ✅ 走 `.env` 里的 `API_KEY`（同一个 token） |

**永远**不要把 token 贴进代码、提示词、commit 信息。

---

## 大数据纪律（再强调一次，AI agent 必看）

不论用哪个 toolkit，**大查询结果不许直接进会话上下文**。流程一律：

```bash
<command> ... > /tmp/<x>.json
# 报告 行数 + 文件路径，不是内容
jq length /tmp/<x>.json
```

具体阈值参考各 toolkit README 的"大数据纪律"小节。

---

## 完整能力清单

需要逐个能力的详细参数 / 错误码 / JSON 形状时：

- `toolkit/marketdb/README.md` —— 决策树、SDK / CLI 总览
- `toolkit/marketdb/docs/cli.md` —— 每个 CLI 命令一节
- `toolkit/marketdb/docs/sdk.md` —— `MarketDB` 全方法签名
- `toolkit/marketdb/docs/schema.md` —— 表 / 视图 / 列定义
- `toolkit/marketdb/docs/recipes.md` —— 10 个常用配方
- `toolkit/fuyao/README.md` —— Pattern A / B / C 接入 + 9 capability 矩阵
- `toolkit/fuyao/docs/api-cheatsheet.md` —— REST endpoint 总览
- `toolkit/fuyao/docs/llms-full.txt` —— 上游协议完整契约
- `toolkit/fuyao/docs/error-codes.md` —— 错误码 + 重试策略
- `toolkit/fuyao/docs/mcp-config.md` —— MCP 客户端配置片段
