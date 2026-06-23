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
- **本地能力**：自动按需拉取全量 / 增量 dump（无需手动下载 Parquet），导入 DuckDB 后用 `marketdb` 做本地查询、研究和回测。
- **Agent 能力**：仓库提供官方 Skill，方便 Agent 按固定规则理解、选择并调用金融数据能力。

## 能力概览

| 能力 | 适用场景 | 推荐入口 |
| --- | --- | --- |
| REST API | 业务系统、脚本、服务端程序直接取数 | [快速开始](https://fuyao.aicubes.cn/docs/quickstart/) |
| MCP Tools | Claude、Cursor、Windsurf、Codex 等 Agent 工具链 | [`toolkit/fuyao/docs/mcp-config.md`](toolkit/fuyao/docs/mcp-config.md) |
| 官方 Agent Skill | 让 AI Agent 自动理解取数边界、工具选择和大结果处理规则 | [`skills/financial-api`](skills/financial-api) |
| Python/CLI toolkit | 在 Python、Notebook、CI、Shell 中调用远端数据 | [`toolkit/fuyao/`](toolkit/fuyao/README.md) |
| 本地 marketdb | 历史行情、复权视图、全市场面板、研究回测、本地 SQL | [`toolkit/marketdb/`](toolkit/marketdb/README.md) |
| 全市场数据导出 | 首次构建本地库，后续按需增量更新 | `python bootstrap.py` / `marketdb auto-sync`（dump 规格见[全市场数据导出](https://fuyao.aicubes.cn/docs/api-reference/market-dumps/)） |

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
python -m pip install -e .

# 推荐：拷贝 .env.example 为 .env，按需填入 API_KEY  等
cp .env.example .env

```

常用 命令：

```bash
# 标的检索
python toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"

# 实时行情快照
python toolkit/fuyao/scripts/fuyao.py prices-snapshot --thscodes 600519.SH

# 利润表
python toolkit/fuyao/scripts/fuyao.py financials-income --thscode 600519.SH --limit 4
```

Python 调用：

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path("toolkit/fuyao/scripts").resolve()))

from fuyao_client import tickers_search, prices_snapshot

hit = tickers_search("贵州茅台", limit=1)[0]
snapshot = prices_snapshot([hit["thscode"]])
```

### 3. 构建本地行情数据库

适用于历史研究、因子分析、回测和大批量 SQL 查询。

只需配置 API Key 后运行一条命令，`bootstrap.py` 会自动判断需要拉取全量还是增量 dump，下载、合并、校验、清理临时文件全程自动完成：

```bash
export API_KEY="<your-api-key>"   # 没有的话到 https://fuyao.aicubes.cn/admin/ 创建
python bootstrap.py               # 默认：API 优先，本地 refer-to/data/ Parquet 兜底
```

模式开关（默认就够用，按需选择）：

```bash
python bootstrap.py --api-only       # 只走 API，不读本地 Parquet
python bootstrap.py --prefer-local   # 优先本地 Parquet，找不到再调 API
python bootstrap.py --local-only     # 完全本地模式，找不到 Parquet 时直接退出
python bootstrap.py --no-sync        # 只装包/建库，跳过数据同步
python bootstrap.py --force          # 已最新时仍强制重拉全量 K 线（auto-sync 走 SKIP→FULL 升级）
```

日常增量同步直接跑：

```bash
marketdb auto-sync --db data/market.duckdb
```

`auto-sync` 会按交易日落后情况选 FULL（全量 dump）/ INCREMENTAL（近 10 日增量 dump，落后 ≤ 7 个交易日时使用）/ SKIP；**每次运行都会重新拉取复权 dump 并重算复权因子**（dump 文件名只到天级粒度，无法判断当天是否有 in-place 内容变化，所以默认不短路），保证 `v_daily_qfq` 不会漂。下载临时文件落到 `data/.cache/dumps/`，应用后立即删除；下载失败时自动重试 1 次，仍失败会提示到 [全市场数据导出](https://fuyao.aicubes.cn/docs/api-reference/market-dumps/) 手动下载并放入 `refer-to/data/` 再用 `--prefer-local` 重跑。

兜底使用本地 Parquet 时需放到 `refer-to/data/`（文件名末尾 `YYYYMMDD` 为快照日期，脚本自动选最新一份）：

- `a_share_daily_k_1d_none_10y_<YYYYMMDD>.parquet`：全市场 10 年日 K
- `a_share_adjustment_factors_event_none_all_<YYYYMMDD>.parquet`：复权事件

> 旧命令 `marketdb update-daily`（逐 thscode 走 REST 接口）作为兼容入口保留，推荐切换到 `marketdb auto-sync`。

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
| 全市场 10 年日 K | Parquet 全量导出，适合本地库初始化 | `marketdb auto-sync` / [market dumps](https://fuyao.aicubes.cn/docs/api-reference/market-dumps/) |
| 复权事件 | 公司行动和复权因子相关数据 | `corp-actions` / `marketdb` |
| 标的检索与代码表 | 名称检索、代码表浏览、Agent 消歧 | `tickers-search` / `tickers-list` |
| 财务报表 | 利润表、资产负债表、现金流量表 | `financials-*` |
| 交易日历 | A 股交易日判断和窗口切分 | `calendar-trading-days` |
| 本地增量更新 | 自动按需拉 FULL / INCREMENTAL dump 并合并到本地 DuckDB | `marketdb auto-sync` |

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


## 测试

```bash
python -m pytest tests/
```

当前测试覆盖 schema、Parquet 导入（含全量 / 增量 overwrite 模式）、数据质量、复权因子、新鲜度守门、Dump 下载与重试、auto-sync 决策与版本短路、API Key 守门、跨平台缓存路径等关键路径。

## 安全与合规

- API Key 只通过 `API_KEY` 环境变量形式传入。
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

## Development History

<!-- FEATURE-ITERATION-LOG:START -->
| 时间 | 迭代内容 | 交付成果 | 相关迭代目录 |
| --- | --- | --- | --- |
| 2026-06-23 | 让 `marketdb` 走「自动下载 dump + 增量合并」替代手工 Parquet 与 REST 逐标的拉取：新增 `auto-sync` CLI、`bootstrap.py` 双轨、`release_tag` 幂等、跨平台缓存与清理、API Key 缺失/鉴权失败引导用户到 admin 控制台获取 key。 | 用户从「自己下 Parquet → 放盘 → 手动导入」转为「配 `API_KEY` → `python bootstrap.py`」一条命令完成首次构建；后续增量直接 `marketdb auto-sync`，复权事件每次自动刷新，避免 `v_daily_qfq` 漂移。 | `feature/2026-06-23-auto-dump-download-and-incremental-merge/` |
<!-- FEATURE-ITERATION-LOG:END -->
