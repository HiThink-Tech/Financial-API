# Python toolkit 路由

本目录是 Python 远端取数与本地数据处理的统一入口。第一次使用时先在这里判断数据是否已经存在于本地、是否要求最新、数据规模多大，再进入一个具体 toolkit。

```text
python/toolkit/
├── README.md       当前路由、职责边界和组合流程
├── fuyao/          远端数据 Python client 与 JSON CLI
└── marketdb/       本地 DuckDB CLI/SDK 的详细文档
```

两套 toolkit 都是工具无关的 Python 能力，不在目录中放 Agent 专用规则。Agent 的统一入口是 [`skills/hithink-finance`](../../skills/hithink-finance/SKILL.md)。

## 决策树

| 判断 | 选择 |
| --- | --- |
| 数据已在 `data/market.duckdb` 且新鲜度满足任务 | [`marketdb`](marketdb/README.md) |
| 需要最新/当天数据、财报、估值、指数、特色数据或标的目录 | [`fuyao`](fuyao/README.md) |
| 不确定本地覆盖范围 | 先运行 `marketdb describe --db data/market.duckdb` |
| 需要全市场、多年研究数据 | 先建库/同步，再用 marketdb；不要逐标的拉远端历史 |

### 按数据类型

| 数据 | 本地 marketdb | 远端 toolkit |
| --- | --- | --- |
| 历史日 K、复权视图、面板、SQL | 主路径 | 仅补缺或按标的取数 |
| 最新行情快照 | 不适用 | 主路径 |
| 公司行动 | 本地事件与日级复权因子 | 最新事件流 |
| 财务报表与财务指标 | 不适用 | 主路径 |
| A 股当前估值快照 | 不适用 | 主路径 |
| 标的目录 | `dim_symbol` / `v_symbol` | 检索、分页与刷新 |
| 交易日历 | 可从本地交易日推导 | 官方窗口 |
| 指数/板块 | 不适用 | 目录、成分和行情 |
| 涨停、连板、异动、热榜、龙虎榜 | 不适用 | 主路径 |
| 全市场 Parquet | 本地导入和管理 | 远端 Market Dumps 签出 |

分钟 K、tick、海外行情、宏观数据、新闻公告原文和研报不在当前公开能力范围内。

## 快速开始

### 安装 Python 项目

从 monorepo 根执行：

```bash
python -m pip install -e ./python
```

### 检查本地数据库

```bash
marketdb status --json --db data/market.duckdb
marketdb describe --db data/market.duckdb
marketdb validate --json --db data/market.duckdb
```

数据库缺失或落后时：

```bash
python python/bootstrap.py
# 或包已安装后
marketdb auto-sync --db data/market.duckdb
```

### 调用远端数据

统一 API Key 在 <https://fuyao.aicubes.cn/admin> 获取。设置用户级 `HITHINK_FINANCE_API_KEY`，或使用 Skill 配置的用户级 `hithink-finance/credentials.env` 后：

```bash
python python/toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"
python python/toolkit/fuyao/scripts/fuyao.py prices-snapshot --thscodes 600519.SH
```

上游端点参数、响应字段和错误码只在 [`docs/api/`](../../docs/api/README.md) 维护；本目录不复制契约。

## 职责边界

1. **本地已有且足够新的历史数据优先使用 marketdb。** 不要为相同历史窗口重复调用远端 REST。
2. **最新、当天、财报、指数和特色数据使用远端 toolkit。** `marketdb auto-sync`/`update-daily` 内部发起的同步请求是本地维护流程，不改变这一用户路由。
3. **全市场长期数据先落库。** 使用 Market Dumps 与 `bootstrap.py`/`auto-sync`，不要发起数千只股票的逐标的多年请求。
4. **toolkit 交付干净数据，不提供投资结论。** 回测、模型、图表和业务解释由调用方完成。
5. **契约不重复。** Python 适配层只维护函数签名、命令和本地语义；上游字段统一链接 `docs/api/`。

## 典型组合流程

### 名称消歧后查本地历史

```bash
python python/toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台" > /tmp/symbol.json
marketdb query --json --db data/market.duckdb \
  --sql "SELECT date, close FROM v_daily_qfq WHERE thscode='600519.SH' ORDER BY date DESC LIMIT 30"
```

调用方从小型检索结果取得唯一 `thscode` 后再查询本地库；不要从名称猜后缀。

### 财报与本地行情组合

远端获取财报，本地读取复权行情，再在 Python 中按报告期对齐。完整可执行示例见 [`../examples/03_fundamentals_join.py`](../examples/README.md)。

### 全市场研究

```bash
marketdb auto-sync --db data/market.duckdb
marketdb describe --db data/market.duckdb
```

随后使用 `MarketDB.get_panel(...)`、只读 SQL 或 `marketdb export`。全市场明细落盘，只输出 shape、文件路径和摘要。

## API Key 与配置

| 路径 | 凭证 |
| --- | --- |
| `toolkit/fuyao` | `HITHINK_FINANCE_API_KEY` 或用户级 `credentials.env`；旧变量仅兼容 |
| `marketdb` 纯本地查询 | 不需要 |
| `marketdb auto-sync` / `update-daily` / `sync-symbols` | 需要统一 API Key |

不要把 Key 写入代码、Prompt、日志、输出文件或提交。

## 大数据纪律

```bash
<command> ... > /tmp/result.json
# 只报告文件路径、行数、时间范围和摘要
```

- 小型检索和单股短窗口可直接查看。
- 全市场、分页全集、长窗口、多标的结果必须落盘。
- 大面板优先使用 `get_panel` 或导出命令，不构造巨大的 `IN (...)` 列表。

## 详细入口

- 远端 Python client 与命令：[`fuyao/README.md`](fuyao/README.md)
- 本地 CLI/SDK/schema/recipes：[`marketdb/README.md`](marketdb/README.md)
- Python 可执行示例：[`../examples/README.md`](../examples/README.md)
- 上游 REST API 契约：[`../../docs/api/README.md`](../../docs/api/README.md)
- 统一 Agent Skill：[`../../skills/hithink-finance/SKILL.md`](../../skills/hithink-finance/SKILL.md)
