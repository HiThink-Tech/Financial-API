# 同花顺金融数据 API

[![Website](https://img.shields.io/badge/官网-fuyao.aicubes.cn-0b66ff)](https://fuyao.aicubes.cn/)
[![Docs](https://img.shields.io/badge/API%20Docs-同花顺金融数据API-0f766e)](https://fuyao.aicubes.cn/docs/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776ab)](pyproject.toml)

**同花顺金融数据 API** 是同花顺面向 AI Agent、量化研究和开发者提供的结构化金融数据服务。平台通过 **REST API、MCP Tools、官方 Agent Skill、Python/CLI toolkit、本地 marketdb** 提供可编程消费的 A 股基础数据，并将逐步开放类似同花顺"涨停聚焦"的任务型数据能力，减少字段清洗、口径对齐、代码映射和数据拼接等处理成本。

- 官网：[https://fuyao.aicubes.cn/](https://fuyao.aicubes.cn/)
- 文档：[https://fuyao.aicubes.cn/docs/](https://fuyao.aicubes.cn/docs/)
- API Key 管理：[https://fuyao.aicubes.cn/admin/](https://fuyao.aicubes.cn/admin/)

## 30 秒了解

- **服务定位**：面向 AI Agent 与量化研究的结构化金融数据服务。
- **接入方式**：REST API、MCP Tools、官方 Agent Skill、Python/CLI toolkit。
- **当前数据**：A 股行情、代码表、公司行动、财务报表、交易日历、全市场数据导出。
- **本地能力**：支持把全市场数据导入 DuckDB，使用 `marketdb` 做本地查询、研究和回测，并支持增量更新。
- **Agent 能力**：仓库提供官方 Skill，方便 Agent 按固定规则理解、选择并调用金融数据能力。

## 能力概览

| 能力 | 适用场景 | 推荐入口 |
| --- | --- | --- |
| REST API | 业务系统、脚本、服务端程序直接取数 | [快速开始](https://fuyao.aicubes.cn/docs/quickstart/) |
| MCP Tools | Claude、Cursor、Windsurf、Codex 等 Agent 工具链 | [`toolkit/fuyao/docs/mcp-config.md`](toolkit/fuyao/docs/mcp-config.md) |
| 官方 Agent Skill | 让 AI Agent 自动理解取数边界、工具选择和大结果处理规则 | [`skills/financial-api`](skills/financial-api) |
| Python/CLI toolkit | 在 Python、Notebook、CI、Shell 中调用远端数据 | [`toolkit/fuyao/`](toolkit/fuyao/README.md) |
| 本地 marketdb | 历史行情、复权视图、全市场面板、研究回测、本地 SQL | [`toolkit/marketdb/`](toolkit/marketdb/README.md) |
| 全市场数据导出 | 首次构建本地库，后续按需增量更新 | [全市场数据导出](https://fuyao.aicubes.cn/docs/api-reference/market-dumps/) |

## 快速开始

### 1. 直接调用 REST API

登录 [同花顺金融数据 API 官网](https://fuyao.aicubes.cn/)，在 [API Key 管理](https://fuyao.aicubes.cn/admin/) 创建 API Key，然后携带 `X-api-key` 请求接口。

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?thscodes=600519.SH' \
  -H 'X-api-key: <your-api-key>'
```

成功响应统一使用 `ApiResponse` 信封：

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4",
  "data": {}
}
```

### 2. 使用 Python/CLI toolkit

克隆本仓库后，安装依赖并配置 API Key：

```bash
python3 -m pip install -e .

# 推荐：拷贝 .env.example 为 .env，按需填入 API_KEY / BASE_URL 等
cp .env.example .env

# 或者直接通过环境变量传入
export API_KEY="<your-api-key>"
```

常用 CLI：

```bash
# 标的检索
python3 toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"

# 实时行情快照
python3 toolkit/fuyao/scripts/fuyao.py prices-snapshot --thscodes 600519.SH

# 利润表
python3 toolkit/fuyao/scripts/fuyao.py financials-income --thscode 600519.SH --limit 4
```

Python 调用（`fuyao_client` 以脚本形式提供，不随 `pip install` 入包，需要注入 `sys.path`）：

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path("toolkit/fuyao/scripts").resolve()))

from fuyao_client import tickers_search, prices_snapshot

hit = tickers_search("贵州茅台", limit=1)[0]
snapshot = prices_snapshot([hit["thscode"]])
```

### 3. 构建本地 marketdb

适用于历史研究、因子分析、回测和大批量 SQL 查询。

1. 从 [全市场数据导出](https://fuyao.aicubes.cn/docs/api-reference/market-dumps/) 下载 Parquet 文件。
2. 放入 `refer-to/data/`。
3. 执行初始化（跨平台 Python 脚本，幂等）。

```bash
python bootstrap.py              # 完整初始化：安装 + .env + 建库 + 导入 + 校验
python bootstrap.py --no-import  # 只做安装与建库、跳过导入
python bootstrap.py --force      # 强制重新导入 Parquet
```

需要的文件（文件名末尾 `YYYYMMDD` 为快照日期，脚本自动选最新一份）：

- `a_share_daily_k_1d_none_10y_<YYYYMMDD>.parquet`：全市场 10 年日 K
- `a_share_adjustment_factors_event_none_all_<YYYYMMDD>.parquet`：复权事件

完成全量导入后，可进行增量更新：

```bash
export API_KEY="<your-api-key>"
marketdb update-daily --db data/market.duckdb
```

查询示例：

```bash
marketdb query --db data/market.duckdb \
  --sql "SELECT date, close FROM v_daily_qfq WHERE thscode = '600519.SH' ORDER BY date DESC LIMIT 10"
```

## AI Agent 快速开始

当你作为 AI Agent 使用本仓库时，按以下顺序读取：

| 任务 | 优先读取 | 调用方式 |
| --- | --- | --- |
| 理解官方 Agent 规则 | [`skills/financial-api`](skills/financial-api) | 优先加载官方 Skill |
| 调用远端实时数据、财报、标的目录、交易日历 | [`toolkit/fuyao/README.md`](toolkit/fuyao/README.md) | REST / MCP / `toolkit/fuyao/scripts/fuyao.py` |
| 查询本地历史行情、复权视图、全市场面板 | [`toolkit/marketdb/README.md`](toolkit/marketdb/README.md) | `marketdb` CLI / Python SDK / SQL |
| 判断该走远端还是本地 | [`toolkit/README.md`](toolkit/README.md) | 按决策树选择路径 |

Agent 调用约定：

- API Key 从环境变量 `API_KEY` 读取，不要写入代码、日志、对话或提交记录。
- 实时、当天、财报、标的目录等数据走 `toolkit/fuyao/`。
- 历史、大批量、回测类数据优先走 `marketdb`。
- 大批量、全市场、多年窗口结果不要直接输出到对话上下文；应落盘到 `/tmp/*.json` 或本地数据文件，只返回摘要和文件路径。
- MCP 客户端按 [`toolkit/fuyao/docs/mcp-config.md`](toolkit/fuyao/docs/mcp-config.md) 配置。

## 当前支持的数据

| 数据 / 能力 | 说明 | 推荐入口 |
| --- | --- | --- |
| A 股实时/近实时行情快照 | 获取标的行情快照 | `prices-snapshot` |
| A 股历史 K 线 | 获取历史价格数据 | `prices-historical` / `marketdb` |
| 全市场 10 年日 K | Parquet 全量导出，适合本地库初始化 | [market dumps](https://fuyao.aicubes.cn/docs/api-reference/market-dumps/) |
| 复权事件 | 公司行动和复权因子相关数据 | `corp-actions` / `marketdb` |
| 标的检索与代码表 | 名称检索、代码表浏览、Agent 消歧 | `tickers-search` / `tickers-list` |
| 财务报表 | 利润表、资产负债表、现金流量表 | `financials-*` |
| 交易日历 | A 股交易日判断和窗口切分 | `calendar-trading-days` |
| 本地增量更新 | 全量导入后更新本地 DuckDB | `marketdb update-daily` |

更多市场、更多频率、更多任务型数据能力会在后续版本中持续增加。

## 项目结构

```text
marketdb/                Python 包：CLI + SDK + DuckDB 数据层
toolkit/                 工具无关 toolkit，适合人和 AI Agent 使用
├── marketdb/            本地 DuckDB 查询 toolkit
└── fuyao/               同花顺远端金融数据 API toolkit
skills/                  官方 Agent Skill
examples/                可运行端到端样例
refer-to/                API/MCP 文档、设计资料、market dumps 放置目录
feature/                 版本迭代工作区
tests/                   pytest 测试套件
bootstrap.py             跨平台一键初始化脚本（幂等）
pyproject.toml           Python 包定义
.env.example             环境变量样例
```

## 版本更新

<!-- FEATURE-ITERATION-LOG:START -->
| 日期 | 新增能力 | 对用户的价值 |
| --- | --- | --- |
| 2026-06-09 | 落地 Python + DuckDB 本地行情库 `marketdb`，支持全量 Parquet 导入、复权因子计算、前/后复权视图、REST 增量更新、CLI/SDK 与测试套件 | 可以在本地高效查询 A 股 10 年日 K 与复权数据，适合研究、回测和批量分析 |
| 2026-06-12 | 落地工具无关的 `toolkit/fuyao` 与官方 Agent Skill `skills/financial-api`，封装同花顺金融数据 API 的 REST/MCP capability，提供 Python 函数库、JSON CLI、MCP 配置文档、错误码与协议说明 | 人类开发者和 AI Agent 都可以用同一套官方入口调用同花顺金融数据 API |
<!-- FEATURE-ITERATION-LOG:END -->

## 测试

```bash
python3 -m pytest tests/
```

当前测试覆盖 schema、Parquet 导入、数据质量、复权因子和新鲜度守门等关键路径。

## 安全与合规

- API Key 只通过 `API_KEY` 环境变量传入。
- 不要把 API Key 写入代码、README、Issue、提示词或 Git commit。
- 本项目提供金融数据访问与本地分析工具，不提供投资建议。
- 数据权限、可访问 capability、调用频率与使用边界以同花顺金融数据 API 官网和账号授权为准。

## 参考文档

- [同花顺金融数据 API 官网](https://fuyao.aicubes.cn/)
- [快速开始](https://fuyao.aicubes.cn/docs/quickstart/)
- [API 参考](https://fuyao.aicubes.cn/docs/api-reference/overview/)
- [全市场数据导出](https://fuyao.aicubes.cn/docs/api-reference/market-dumps/)
- [`toolkit/README.md`](toolkit/README.md)
- [`toolkit/fuyao/README.md`](toolkit/fuyao/README.md)
- [`examples/README.md`](examples/README.md)
