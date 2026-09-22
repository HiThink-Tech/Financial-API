# 同花顺金融数据服务

[![Website](https://img.shields.io/badge/官网-fuyao.aicubes.cn-0b66ff)](https://fuyao.aicubes.cn/)
[![Docs](https://img.shields.io/badge/API%20Docs-同花顺金融数据服务-0f766e)](https://fuyao.aicubes.cn/docs/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776ab)](python/pyproject.toml)
[![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-339933)](hithink-finance-cli/package.json)

**同花顺金融数据服务（hithink-finance）** 是由同花顺官方提供和维护的 A 股金融数据服务，面向 AI Agent、量化研究者和应用开发者。

通过统一 API Key，可以查询 A 股行情、集合竞价、财务报表、估值、指数与板块、公募基金、公开期货期权和特色数据，并通过 REST API、MCP、CLI、Python SDK、本地 DuckDB 或 Agent Skill 接入现有工作流。

> 一站式同花顺官方金融数据能力，覆盖查询、研究、批量导出和 AI Agent 自动调用。

- 官网：<https://fuyao.aicubes.cn/>
- 在线文档：<https://fuyao.aicubes.cn/docs/>
- API Key 管理：<https://fuyao.aicubes.cn/admin/>
- 仓库文档中心：[`docs/`](docs/README.md)
- 同花顺AI客户端：[下载并体验](https://lumi.10jqka.com.cn/?channel=Hithink-API)

> API、MCP、CLI、Python SDK 和 Agent Skill 适合自主接入；同花顺AI客户端已接入当前数据源，金融数据与分析能力已内置，打开客户端即可使用。

## 选择接入方式

| 使用场景 | 推荐方式 | 说明 |
| --- | --- | --- |
| 让 AI Agent 自动查询和分析金融数据 | [`hithink-finance` Skill](skills/hithink-finance/SKILL.md) | 根据任务和当前环境选择 CLI、MCP 或 REST API |
| 在终端、Agent 或自动化任务中统一取数和导出 | [CLI](hithink-finance-cli/README.md) | 整合远端取数、本地 DuckDB、认证和结构化输出 |
| 在 Chat Bot 或 IDE 中直接调用 | [MCP](docs/mcp.md) | 配置托管服务和 API Key 后在对话中使用 |
| 接入网站、App、后台服务或其他语言 | [REST API](docs/api/README.md) | 标准 HTTP 接口，适合自定义集成 |
| 在 Python、Notebook 或研究流程中使用 | [Python SDK](python/README.md) | 适合数据处理、自定义分页和研究脚本 |
| 长期维护历史行情并使用 SQL 研究 | [marketdb](python/toolkit/marketdb/README.md) | 本地构建和增量维护 DuckDB 数据库 |
| 获取全市场或长时间范围数据 | [CLI](hithink-finance-cli/README.md) / [Market Dumps](docs/api/market-dumps.md) | 使用批量能力并让大结果直接落盘 |
| 免配置使用金融数据或端内专用能力 | [同花顺AI客户端](https://lumi.10jqka.com.cn/?channel=Hithink-API) | 数据源已经接入，打开客户端即可使用 |

不确定如何选择时，优先安装 `hithink-finance` Skill；如果希望直接在终端调用，优先使用 CLI。

## 数据能力与边界

| 数据 / 能力 | 主要用途 | 推荐入口 |
| --- | --- | --- |
| 标的目录 | 根据名称、代码或关键词查找唯一 `thscode` | CLI / API / MCP / Python |
| A 股最新行情 | 查询单只、多只或全市场股票的最新价格与交易数据 | CLI / API / MCP / Python |
| A 股历史 K 线 | 获取历史走势，用于研究、回测和趋势分析 | CLI / marketdb |
| 集合竞价 | 查询竞价实时或终态快照与短期强弱基准 | CLI / API / MCP / Python |
| 公司行动与复权 | 查询分红、送转等公司行动并生成复权数据 | CLI / marketdb |
| 财务报表与指标 | 查询利润表、资产负债表、现金流量表和财务指标 | CLI / API / MCP / Python |
| A 股估值快照 | 批量查询市盈率、市净率、市销率和市现率 | CLI / API / MCP / Python |
| 交易日历 | 判断交易日并安排数据同步或研究窗口 | CLI / API / MCP / Python |
| 指数与板块 | 查询目录、成分股、快照和历史行情 | CLI / API / MCP / Python |
| 特色数据 | 查询涨跌停、炸板、连板、异动、热榜和龙虎榜 | CLI / API / MCP / Python |
| 公募基金 | 查询资料、公司、经理、财务、持仓、净值、业绩、资讯和场内行情 | CLI / API / MCP / Python |
| 公开期货 | 查询品种、合约、持仓、仓单、基差、交易日程、分时和日 K | CLI / API / MCP / Python |
| 公开期权 | 查询品种、合约、分时和日 K | CLI / API / MCP / Python |
| 全市场数据文件 | 下载全量或增量日 K、公司行动等标准数据文件 | CLI / Market Dumps |
| 本地 DuckDB | 初始化、同步、校验、修复、SQL 查询和导出 | CLI / marketdb |
| 端内专用数据与分析 | 在客户端使用资金流向、高频动向和期货期权专业数据 | [同花顺AI客户端](https://lumi.10jqka.com.cn/?channel=Hithink-API) |

当前公开方式不提供分钟 K、tick、Level-2、港股或美股行情、宏观数据、新闻公告原文、研报原文、基金申赎交易和投资推荐。标记为“端内专用”的能力已内置于同花顺AI客户端，不通过公开 API、MCP、CLI 或 Python SDK 提供。数据权限及实际可访问能力以官网和账号授权为准；请求未支持的数据时，不使用模拟数据或静态示例冒充真实结果。

## 快速开始

### 1. 获取统一 API Key

登录 [同花顺金融数据服务官网](https://fuyao.aicubes.cn/)，进入 [API Key 管理](https://fuyao.aicubes.cn/admin/) 创建 Key。

API、MCP、CLI 和 Python 远端取数共用同一个 API Key。安装 `hithink-finance` Skill 后，具备本地浏览器操作能力的 Agent 可以在用户扫码一次后完成 Key 签发、安全交接、用户级环境变量、`credentials.env`、CLI 凭据库和真实请求验证；其他场景可按同一 runbook 逐步操作。具体流程见 [首次登录、创建与持久配置](skills/hithink-finance/references/api-key-onboarding.md)。

用户可以直接把 API Key 提供给 Agent 上下文以便代配；Agent 不应复述，并应提示聊天平台可能保留消息记录。Key 不要写入代码、README、Issue、日志、产物或 Git；本地持久化优先使用用户级环境变量、用户级凭据文件、系统凭据库或客户端 Secret。

### 2. Agent Skill

`hithink-finance` Skill 是 AI Agent 使用本项目的统一入口，提供接入方式选择、标的消歧、REST 与 MCP 契约镜像、安全规则和大结果落盘约定。

推荐通过公开仓库安装：

```bash
npx skills add HiThink-Tech/Financial-API --skill hithink-finance -g --yes
```

无网络条件下，可以从 [Skill Hub](https://www.skillhub.cn/skills/hithink-finance) 安装；也可以复制完整的 [`skills/hithink-finance/`](skills/hithink-finance/SKILL.md) 目录。复制时必须保留 `references/`。

重新打开 Agent 会话后即可直接描述需求：

```text
查询贵州茅台的最新行情，并分析近一年的涨跌幅、最大回撤和均线趋势。
```

### 3. CLI

CLI 是人类终端、Agent 和自动化任务的默认推荐入口：

```bash
npm install -g @hithink-tech/hithink-finance-cli
hithink-finance auth login
hithink-finance capabilities --format json
```

常见命令：

```bash
# 根据代码或名称查找股票
hithink-finance symbol search --q 600519 --limit 5 --format json

# 查询最新行情
hithink-finance market snapshot --thscodes 600519.SH --format json

# 查询最近四期利润表
hithink-finance financials income --thscode 600519.SH --limit 4 --format json

# 初始化本地数据库
hithink-finance data init --format json

# 查询本地前复权日线
hithink-finance db query \
  --sql "SELECT * FROM v_daily_qfq LIMIT 10" \
  --format json
```

CLI 会为已检测到的 Agent 同步配套领域 Skills。支持目标、自定义目录、修复、移除和手工兜底安装方式见 [CLI Skills 管理说明](hithink-finance-cli/README.md#agent-skill-lifecycle)。

仅在参与仓库开发或 npm 暂不可用时从源码验证：

```bash
cd hithink-finance-cli
npm ci --ignore-scripts
npm run build
node dist/cli/main.js capabilities --format json
```

完整命令和生命周期说明见 [`hithink-finance-cli/README.md`](hithink-finance-cli/README.md)。

### 4. REST API

REST API 适合服务端、自定义语言和零依赖 HTTP 集成。以下示例查询贵州茅台最新行情：

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?thscodes=600519.SH' \
  -H 'X-api-key: <API_KEY>'
```

- 仓库内契约：[REST API 文档](docs/api/README.md)
- 在线文档：<https://fuyao.aicubes.cn/docs/>
- 文档全文聚合：<https://fuyao.aicubes.cn/llms-full.txt>

`docs/api/` 按业务域提供原子接口文档；字段、参数和错误语义以目标接口正文为准。

### 5. MCP

MCP 适合 Claude Desktop、Cursor、Windsurf 和其他支持 MCP 的客户端。当前提供六个托管服务：

| 服务名称 | 地址 | 主要能力 |
| --- | --- | --- |
| `hithink-finance-a-share` | `https://fuyao.aicubes.cn/mcp/a-share` | A 股行情、财务、估值、竞价和特色数据 |
| `hithink-finance-a-share-index` | `https://fuyao.aicubes.cn/mcp/a-share-index` | 指数、板块、成分和行情 |
| `hithink-finance-meta` | `https://fuyao.aicubes.cn/mcp/meta` | 标的检索和能力发现 |
| `hithink-finance-fund` | `https://fuyao.aicubes.cn/mcp/fund` | 公募基金资料、披露、净值、收益和场内行情 |
| `hithink-finance-futures` | `https://fuyao.aicubes.cn/mcp/futures` | 公开期货资料、持仓、基差、日程和行情 |
| `hithink-finance-options` | `https://fuyao.aicubes.cn/mcp/options` | 公开期权品种、合约和行情 |

单个服务的配置结构如下：

```json
{
  "mcpServers": {
    "hithink-finance-a-share": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share",
      "headers": {
        "X-api-key": "${HITHINK_FINANCE_API_KEY}"
      }
    }
  }
}
```

完整配置、安全方式、服务路由和验证步骤见 [MCP 接入说明](docs/mcp.md)。实际调用或排查参数变化时，以当前连接返回的 `tools/list` 为准。

### 6. Python SDK 与 marketdb

安装 Python 子项目：

```bash
python -m pip install -e ./python
```

查询远端数据：

```bash
python python/toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"
python python/toolkit/fuyao/scripts/fuyao.py prices-snapshot --thscodes 600519.SH
```

初始化并检查本地数据库：

```bash
python python/bootstrap.py
marketdb status --json --db data/market.duckdb
marketdb validate --json --db data/market.duckdb
```

更多说明：

- [Python README](python/README.md)
- [toolkit 路由](python/toolkit/README.md)
- [marketdb 文档](python/toolkit/marketdb/README.md)
- [Python 可执行示例](python/examples/README.md)

## 示例与灵感

[`examples/inspirations/`](examples/inspirations/README.md) 提供可以复制使用的 Prompt、预览图和静态 HTML；[`python/examples/`](python/examples/README.md) 提供 SDK、marketdb 和远端数据组合示例。

### 单股行情与趋势速览

[![单股行情与趋势速览](examples/inspirations/01-stock-overview/preview.jpg)](examples/inspirations/01-stock-overview/README.md)

该示例组合展示最新行情、近一年日 K、均线、区间表现和最大回撤。

- [完整说明与 Prompt](examples/inspirations/01-stock-overview/README.md)
- [直接打开静态 HTML](examples/inspirations/01-stock-overview/example.html)

> 示例用于说明数据组合方式，不是数据能力契约、投资建议或固定视觉标准。

## 使用约束

- 本项目不设置累计调用次数上限，但调用方应避免短时间集中请求或使用过高并发；触发动态限流后应降低频率和并发度，并在适当延迟后重试。
- 全市场、分页全集、多标的或长时间窗口结果必须落盘，只在终端或对话中展示路径、行数、窗口和摘要。
- 首次使用名称或不完整代码时，应先检索并确认唯一 `thscode`，不要猜测交易所或指数后缀。
- 历史行情结果应注明时间窗口和复权口径；财务结果应注明报告期。
- 离线文档、测试和帮助信息只能证明支持范围；线上可用性需要通过实际授权请求验证。
- 真实数据不可用时应说明原因，不使用近似数据、静态示例或模拟数据替代。
- 本项目提供金融数据访问和研究数据准备工具，不提供投资建议。

## 最新变化

项目对外可见的重要变化按时间倒序记录在 [`CHANGELOG.md`](CHANGELOG.md)，避免在多个入口重复维护易过期的版本摘要。

旧版根级 Python 用户、脚本和 Agent Prompt 请先阅读 [Monorepo 版本升级指南](docs/monorepo-migration.md)；本地数据库和数据文件不需要随代码目录迁移。

## 项目结构与参与开发

```text
docs/                    公共文档中心；REST 与 MCP 契约和接入说明
skills/hithink-finance/  可独立安装的统一 Agent Skill；包含契约镜像
hithink-finance-cli/     Node.js CLI 子项目，运行时不依赖 Python
python/                  Python SDK、远端 toolkit、marketdb、示例和测试
examples/                monorepo 级示例导航和静态灵感
scripts/                 仓库级维护脚本
```

详细参数和契约下沉到对应子项目 README 或 `docs/`。`skills/hithink-finance/references/api.md`、`references/api/`、`references/mcp.md` 和 `references/mcp/` 均由同步脚本生成，不要直接编辑；契约更新后从仓库根目录运行：

```bash
python scripts/sync_skill_contracts.py
python scripts/sync_skill_contracts.py --check
python -m pytest python/tests/

cd hithink-finance-cli
npm run verify
```

`internal/` 和 `sdd-docs/` 属于内部治理与开发记录，不是公开使用入口。

## 文档导航

- [文档中心](docs/README.md)
- [REST API 契约](docs/api/README.md)
- [MCP 接入说明](docs/mcp.md)
- [CLI README](hithink-finance-cli/README.md)
- [Python README](python/README.md)
- [Python toolkit](python/toolkit/README.md)
- [marketdb 文档](python/toolkit/marketdb/README.md)
- [Agent Skill](skills/hithink-finance/SKILL.md)
- [Monorepo 升级指南](docs/monorepo-migration.md)
- [更新日志](CHANGELOG.md)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=HiThink-Tech/Financial-API&type=Date)](https://www.star-history.com/#HiThink-Tech/Financial-API&Date)

## License

本仓库采用 [MIT License](LICENSE)。
