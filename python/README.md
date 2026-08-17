# Python 子项目

`python/` 是同花顺金融数据服务 monorepo 中唯一的 Python 项目根，面向 Python 应用、Notebook、研究脚本和本地 DuckDB 工作流。这里包含远端取数 toolkit、本地 `marketdb` CLI/Python SDK、可执行示例、测试和维护工具。

如果只想通过终端或 Agent 一体化使用远端和本地能力，优先选择 [`hithink-finance` CLI](../hithink-finance-cli/README.md)；如果需要 Python 二次开发或已经使用 marketdb，再进入本目录。

## 目录结构

```text
python/
├── marketdb/          本地 DuckDB 包、CLI、SDK 和 SQL 资产
├── toolkit/
│   ├── fuyao/         远端数据 Python client 与 JSON CLI
│   └── marketdb/      本地数据详细使用文档
├── examples/          可执行 Python 示例
├── tests/             pytest 测试套件
├── tools/             Python 维护工具
├── bootstrap.py       安装、建库和同步入口
└── pyproject.toml     Python 包与依赖配置
```

## 安装

需要 Python 3.11 或更高版本。在 monorepo 根执行：

```bash
python -m pip install -e ./python
```

从旧版根级 Python 布局升级时，先按 [Monorepo 版本升级指南](../docs/monorepo-migration.md) 卸载旧 editable 映射并从 `./python` 重装。根级 `data/market.duckdb`、`.env` 和 `refer-to/data/` 不需要迁移。

## 选择远端还是本地

| 目标 | 使用 |
| --- | --- |
| 最新行情、集合竞价、财报、财务指标、估值、指数、基金、特色数据、标的检索 | [`toolkit/fuyao/`](toolkit/fuyao/README.md) |
| 历史行情、复权、面板、SQL、研究数据准备 | [`toolkit/marketdb/`](toolkit/marketdb/README.md) |
| 不确定数据在哪或需要组合两者 | [`toolkit/README.md`](toolkit/README.md) |

上游 REST 参数与响应字段统一在 [`../docs/api/`](../docs/api/README.md) 维护；Python 文档只说明函数、脚本和本地处理方式。

## 快速开始

### 远端取数

先从 <https://fuyao.aicubes.cn/admin> 获取统一 API Key，并设置推荐的用户级环境变量 `HITHINK_FINANCE_API_KEY`。Python 也会读取 `hithink-finance/credentials.env` 用户级凭据文件；`FUYAO_TOKEN` 和 `API_KEY` 仅保留为旧版本兼容来源：

```bash
python python/toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"
python python/toolkit/fuyao/scripts/fuyao.py prices-snapshot --thscodes 600519.SH
python python/toolkit/fuyao/scripts/fuyao.py financials-income --thscode 600519.SH --limit 4
python python/toolkit/fuyao/scripts/fuyao.py valuations-snapshot --thscodes 600519.SH,000001.SZ
```

### 本地数据库

```bash
python python/bootstrap.py
marketdb status --json --db data/market.duckdb
marketdb describe --db data/market.duckdb
marketdb validate --json --db data/market.duckdb
```

`bootstrap.py` 会安装 Python 包、初始化数据库并按配置同步数据。日常增量使用：

```bash
marketdb auto-sync --db data/market.duckdb
```

## Python SDK

远端 client 位于 `toolkit/fuyao/scripts/fuyao_client.py`；本地 SDK 通过 `marketdb.MarketDB` 暴露：

```python
from marketdb import MarketDB

with MarketDB.open("data/market.duckdb") as db:
    daily = db.get_daily("600519.SH", start="2025-01-01", adjust="forward")
    panel = db.get_panel(start="2026-01-01", end="2026-01-31")
```

详细调用方式见 [toolkit 路由](toolkit/README.md)，可运行示例见 [`examples/`](examples/README.md)。

## 验证

从 monorepo 根执行：

```bash
python python/bootstrap.py --help
python python/toolkit/fuyao/scripts/fuyao.py --help
python -m pytest python/tests/
```

测试与示例默认假设当前工作目录是 monorepo 根。大结果写入 `/tmp/`、`out/` 或用户指定路径，不要把全市场、多年或多标的原始结果打印到 Agent 对话。

## 安全

- API Key 只通过环境变量、Secret 或安全输入传入，不写入代码、Prompt、日志或 Git。
- 本地 DuckDB 不存储 API Key。
- 数据分析应标注来源、时间、复权口径和“非投资建议”。
