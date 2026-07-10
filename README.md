# 同花顺金融数据服务

[![Website](https://img.shields.io/badge/官网-fuyao.aicubes.cn-0b66ff)](https://fuyao.aicubes.cn/)
[![Docs](https://img.shields.io/badge/API%20Docs-同花顺金融数据服务-0f766e)](https://fuyao.aicubes.cn/docs/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776ab)](python/pyproject.toml)
[![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-339933)](hithink-finance-cli/package.json)

**同花顺金融数据服务（hithink finance）** 面向 AI Agent、量化研究和开发者，一站式提供 REST API、托管 MCP、Node.js CLI、Python toolkit/SDK、本地 DuckDB 与官方 Agent Skill。用户可以按场景自由选择接入方式，用统一 API Key 获取 A 股行情、财报、指数、板块、特色数据和全市场数据，并在本地完成同步、查询、研究数据准备与导出。

- 官网：<https://fuyao.aicubes.cn/>
- 在线文档：<https://fuyao.aicubes.cn/docs/>
- API Key 管理：<https://fuyao.aicubes.cn/admin/>
- 仓库文档中心：[`docs/`](docs/README.md)

## 30 秒了解

- **服务定位**：面向各类 AI Agent 场景和开发工具的一站式金融数据服务。
- **接入方式**：REST API、托管 MCP、`hithink-finance` CLI、Python toolkit/SDK、本地 marketdb、统一 Agent Skill。
- **当前数据**：A 股行情、标的目录、公司行动、财务报表与指标、交易日历、指数/板块、涨停/连板、个股异动、热榜、龙虎榜和全市场 Parquet。
- **本地能力**：通过 CLI 或 marketdb 自动构建、增量同步和校验 DuckDB，支持历史行情、复权、全市场面板、SQL 和文件导出。
- **Agent 能力**：安装一个 [`hithink-finance` Skill](skills/hithink-finance/SKILL.md)，Agent 会检测当前环境和能力边界，在 API/MCP/CLI/Python SDK 间自动选择。

## 能力概览

| 能力 | 适用场景 | 推荐入口 |
| --- | --- | --- |
| `hithink-finance` Skill | 让 Agent 自动选工具、处理认证、约束大结果并按需加载契约 | [`skills/hithink-finance/`](skills/hithink-finance/SKILL.md) |
| CLI | 人类终端、Agent、自动化、远端取数和本地 DuckDB 一体化 | [`hithink-finance-cli/`](hithink-finance-cli/README.md) |
| REST API | 零依赖 HTTP、自定义语言、服务端集成和自由编排 | [REST API 契约](docs/api/README.md) |
| MCP | Chat Bot、IDE Chat 和支持 MCP 的客户端 | [MCP 接入说明](docs/mcp.md) |
| Python toolkit/SDK | Python、Notebook、研究脚本和自定义取数策略 | [`python/`](python/README.md) |
| marketdb | 本地历史行情、复权、全市场面板、SQL 和研究数据准备 | [`python/toolkit/marketdb/`](python/toolkit/marketdb/README.md) |

## 最新变化

当前 monorepo 版本带来三项关键变化，完整历史见 [`CHANGELOG.md`](CHANGELOG.md)：

1. **新增 `hithink-finance` Node.js CLI**：统一远端数据、本地 DuckDB、稳定 JSON 信封、能力发现、诊断和生命周期命令；推荐直接从 npm 安装。
2. **新增统一 `hithink-finance` Skill**：原根目录的通用、REST、MCP 和 CLI Setup Skills 已合并为一个可独立安装的入口，覆盖 API/MCP/CLI/Python SDK。
3. **仓库升级为 monorepo**：Python 项目已迁入 `python/`。旧版用户和 Agent 必须先按 [Monorepo 版本升级指南](docs/monorepo-migration.md) 更新 editable 安装、脚本路径、CI 和 Prompt；本地数据库与 `.env` 不需要迁移。

## 快速开始

### 1. 获取统一 API Key

登录 [同花顺金融数据服务官网](https://fuyao.aicubes.cn/)，在 [API Key 管理](https://fuyao.aicubes.cn/admin/) 创建 Key。API、MCP、CLI 和 Python 远端取数共用这一凭证。

不要把 API Key 粘贴到对话、代码、日志、公开配置或 Git；根据接入方式使用隐藏输入、环境变量、stdin 或客户端 Secret。

### 2. 优先安装 `hithink-finance` Skill

Skill 是 Agent 使用本项目的统一说明书。它包含接入方式选择、API/MCP/CLI/Python 快速路径、完整 API 契约镜像、安全规则和大结果处理规范。

使用支持 [Agent Skills](https://agentskills.io/) 的通用安装器：

```bash
npx skills add HiThink-Tech/Financial-API --skill hithink-finance -g --yes
```

也可以把完整的 [`skills/hithink-finance/`](skills/hithink-finance/SKILL.md) 目录复制到 Agent 文档声明的 Skills 发现目录。必须保留 `references/`，不要只复制 `SKILL.md`。安装后新开会话，并直接描述金融数据需求。

### 3. 按场景选择接入方式

#### CLI：人类与 Agent 的默认推荐

CLI 把远端取数、本地数据库、认证、结构化输出和大结果落盘统一为一个命令面。优先从 npm 安装：

```bash
npm install -g @hithink-tech/hithink-finance-cli
hithink-finance auth login
hithink-finance capabilities --format json
```

仅在参与仓库开发或 npm 暂不可用时从源码验证：

```bash
cd hithink-finance-cli
npm ci --ignore-scripts
npm run build
node dist/cli/main.js capabilities --format json
node dist/cli/main.js doctor --format json
```

常见命令：

```bash
hithink-finance symbol search --q 600519 --limit 5 --format json
hithink-finance market snapshot --thscodes 600519.SH --format json
hithink-finance financials income --thscode 600519.SH --limit 4 --format json
hithink-finance data init --format json
hithink-finance db query --sql "SELECT * FROM v_daily_qfq LIMIT 10" --format json
```

完整说明见 [CLI README](hithink-finance-cli/README.md)。

#### REST API：零依赖、可塑性最高

直接用 `curl` 或任意 HTTP 客户端：

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?thscodes=600519.SH' \
  -H 'X-api-key: <API_KEY>'
```

API 适合自行编写取数策略、接入业务系统或使用任意编程语言。仓库内唯一上游契约源是 [`docs/api/`](docs/api/README.md)；上游完整机器可读契约始终保留在 <https://fuyao.aicubes.cn/llms-full.txt>，仓库不再保存副本。

#### MCP：最快接入 Chat Bot

把三个托管端点一次配置到 Claude Desktop、Cursor、Windsurf 或其他 MCP 客户端；客户端中使用 `hithink-finance-*` 作为服务名称：

```json
{
  "mcpServers": {
    "hithink-finance-a-share": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share",
      "headers": { "X-api-key": "${API_KEY}" }
    },
    "hithink-finance-a-share-index": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share-index",
      "headers": { "X-api-key": "${API_KEY}" }
    },
    "hithink-finance-meta": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/meta",
      "headers": { "X-api-key": "${API_KEY}" }
    }
  }
}
```

配置位置、安全方式、意图路由和验证步骤见 [MCP 接入说明](docs/mcp.md)；Skill 已内置工具功能快照，只有在实际调用或排查参数变化时才读取当前连接的 `tools/list`。

#### Python SDK：二次开发与研究

```bash
python -m pip install -e ./python
python python/toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"
python python/toolkit/fuyao/scripts/fuyao.py prices-snapshot --thscodes 600519.SH
```

本地历史与研究：

```bash
python python/bootstrap.py
marketdb status --json --db data/market.duckdb
marketdb query --json --db data/market.duckdb \
  --sql "SELECT date, close FROM v_daily_qfq WHERE thscode='600519.SH' ORDER BY date DESC LIMIT 10"
```

Python 子项目包含远端取数 toolkit、`marketdb` CLI/Python SDK、示例和测试。详见 [Python README](python/README.md) 与 [toolkit 路由](python/toolkit/README.md)。

## AI Agent 使用约定

进入仓库的 Agent 按以下顺序读取：

1. [`AGENTS.md`](AGENTS.md)
2. [`skills/hithink-finance/SKILL.md`](skills/hithink-finance/SKILL.md)
3. 与选中接入方式对应的一个详细入口

执行时遵守：

- 用户给名称或不完整代码时，先消歧为唯一 `thscode`，不要猜交易所后缀。
- 最新/当天/财报/指数/特色数据使用远端能力；本地已有且足够新的历史行情优先使用 DuckDB。
- 全市场、多年、多标的或分页全集必须落盘，只在对话中返回路径、行数和摘要。
- 真实数据不可用就报告原因，不使用模拟数据或静态示例冒充。
- 结果注明数据源、时间范围、报告期、复权口径和“非投资建议”。

## 数据与场景

| 数据 / 能力 | 说明 | 推荐入口 |
| --- | --- | --- |
| A 股实时/近实时行情 | 单只、批量或全市场分页快照 | CLI / API / MCP / Python |
| A 股历史 K 线 | 远端按标的查询；本地库覆盖长期研究 | CLI / marketdb |
| 公司行动与复权 | 远端事件流、本地前后复权视图和因子 | CLI / marketdb |
| 财务报表与财务指标 | 利润表、资产负债表、现金流量表和五类指标 | CLI / API / MCP / Python |
| 标的目录 | 名称、ticker、`thscode` 检索与代码表 | CLI / API / MCP / Python |
| 指数与板块 | 目录、成分股、行情快照和历史 K 线 | CLI / API / MCP / Python |
| 特色数据 | 涨停池、连板天梯、异动、热榜和龙虎榜 | CLI / API / MCP / Python |
| 全市场数据导出 | 全量/增量日 K 与公司行动 Parquet | CLI / Market Dumps |
| 本地 DuckDB | 同步、状态、校验、迁移、修复、SQL、面板和导出 | CLI / marketdb |

分钟 K、tick、海外行情、宏观数据、新闻公告原文和研报目前不在公开能力范围内。请求未支持能力时应明确说明。

## 示例与灵感

- [Python 可执行示例](python/examples/README.md)：SDK、marketdb 和远端数据组合。
- [金融看板灵感](examples/inspirations/README.md)：可复制 Prompt、预览和静态 HTML。

### 默认示例：单股行情与趋势速览

[![单股行情与趋势速览](examples/inspirations/01-stock-overview/preview.jpg)](examples/inspirations/01-stock-overview/README.md)

从一只股票出发，将最新行情、近一年日 K、均线、区间表现和回撤组织成可继续探索的看板。查看 [完整说明与 Prompt](examples/inspirations/01-stock-overview/README.md)，或[直接打开静态 HTML](examples/inspirations/01-stock-overview/example.html)。

示例用于展示组合方式，不是能力契约、投资建议或视觉复现标准。

## 项目结构

```text
docs/                    公共文档中心；docs/api 是上游 REST 契约 SSOT
skills/hithink-finance/  可独立安装的统一 Agent Skill；包含契约镜像
hithink-finance-cli/     Node.js CLI 子项目，运行时不依赖 Python
python/                  唯一 Python 项目根
├── marketdb/            本地 DuckDB CLI 与 Python SDK
├── toolkit/fuyao/       远端数据 Python client 与脚本
├── toolkit/marketdb/    本地数据使用文档
├── examples/            Python 可执行示例
└── tests/               Python 测试
examples/                monorepo 级示例导航和静态灵感
scripts/                 仓库级维护脚本
```

`internal/` 和 `sdd-docs/` 属于内部治理与开发记录，不是公开使用入口。

## 文档与契约治理

- 根 README 负责完整总览；详细参数下沉到对应子目录 README 或 `docs/`。
- `docs/api/` 是上游 REST API 契约唯一来源。
- `skills/hithink-finance/references/api.md`、`references/api/`、`references/mcp.md` 与 `references/mcp/` 由 `python scripts/sync_skill_contracts.py` 生成，保证 Skill 独立发布仍自包含。
- Python 和 CLI 文档只维护自己的运行方式、命令和适配语义，不复制上游字段契约。
- 旧版迁移只认 [Monorepo 版本升级指南](docs/monorepo-migration.md)。

## 验证

```bash
python scripts/sync_skill_contracts.py --check
python -m pytest python/tests/

cd hithink-finance-cli
npm run verify
```

## 安全与合规

- 所有远端方式共用 API Key，但凭证只通过安全输入、环境变量、stdin、凭据库或客户端 Secret 传入。
- 不要把 API Key 写入代码、README、Issue、Prompt、日志、产物或 Git commit。
- 大结果必须落盘，避免终端、日志和 Agent 上下文泄露或膨胀。
- 本项目提供金融数据访问与研究数据准备工具，不提供投资建议。
- 数据权限、调用频率和可访问 capability 以官网与账号授权为准。
