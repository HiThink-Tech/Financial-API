# 同花顺金融数据服务

[![Website](https://img.shields.io/badge/官网-fuyao.aicubes.cn-0b66ff)](https://fuyao.aicubes.cn/)
[![Docs](https://img.shields.io/badge/API%20Docs-同花顺金融数据服务-0f766e)](https://fuyao.aicubes.cn/docs/)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776ab)](python/pyproject.toml)
[![Node.js](https://img.shields.io/badge/Node.js-22.12%2B-339933)](hithink-finance-cli/package.json)

**同花顺金融数据服务（hithink-finance）** 是由同花顺官方提供和维护的 A股金融数据服务，面向 AI Agent、量化研究者和应用开发者。

通过一个统一的 API Key，即可查询 A股最新行情快照、历史行情、财务报表、估值、指数、板块、公募基金资料与净值、涨停、连板、个股异动、热榜和龙虎榜等数据，并将数据接入 AI 工具、Python 研究脚本、量化程序或业务系统。

> 一站式同花顺官方金融数据能力，覆盖 API、MCP、CLI、Python SDK、本地数据库和 Agent Skill。

- 官网：<https://fuyao.aicubes.cn/>
- 在线文档：<https://fuyao.aicubes.cn/docs/>
- API Key 管理：<https://fuyao.aicubes.cn/admin/>
- 仓库文档中心：[`docs/`](docs/README.md)

---

## 你可以用它做什么

- 查询一只或多只 A股的最新价格、涨跌幅、成交额等行情数据。
- 获取股票、指数和板块的历史 K 线，用于趋势分析和量化研究。
- 查询上市公司的利润表、资产负债表、现金流量表和财务指标。
- 批量查询 A 股最新市盈率、市净率、市销率和市现率估值快照。
- 获取交易日历、公司行动、复权因子等基础研究数据。
- 查询涨停池、连板天梯、个股异动、热榜和龙虎榜等同花顺特色数据。
- 查询公募基金资料、披露持仓、净值、区间收益、持有人结构以及 ETF/LOF 场内行情。
- 下载全市场数据，为回测、选股、因子研究和 AI 分析准备数据。
- 让 Claude、Cursor、Windsurf 等支持 MCP 或 Agent Skill 的工具直接调用金融数据。
- 在本地构建 DuckDB 数据库，完成增量同步、SQL 查询、复权计算和文件导出。

---

## 30 秒了解

### 这是什么

同花顺官方面向 AI Agent、量化研究和开发者提供的 A股金融数据服务。

### 有什么数据

覆盖 A股行情、标的目录、公司行动、财务报表与指标、估值、交易日历、指数、板块、公募基金、涨停、连板、个股异动、热榜、龙虎榜和全市场数据文件。

### 怎么使用

可以通过 REST API、托管 MCP、`hithink-finance` CLI、Python SDK、本地 marketdb 或统一 Agent Skill 接入。

### 不知道选哪种方式

优先安装 [`hithink-finance` Skill](skills/hithink-finance/SKILL.md)。Agent 会识别当前环境和任务，在 API、MCP、CLI 与 Python SDK 之间自动选择合适的能力。

---

## 按使用场景选择接入方式

| 你的需求 | 推荐方式 | 说明 |
| --- | --- | --- |
| 想让 AI Agent 自动查询金融数据 | `hithink-finance` Skill | Agent 自动判断使用 API、MCP、CLI 或 Python SDK |
| 想让 Claude、Cursor 等聊天工具快速接入 | MCP | 配置服务地址和 API Key 后即可在对话中调用 |
| 想在 Python、Notebook 中研究股票 | Python toolkit/SDK | 适合研究脚本、数据处理和自定义取数策略 |
| 想把数据接入网站、App 或公司系统 | REST API | 零依赖 HTTP 接入，适合任意编程语言和服务端系统 |
| 想通过终端批量查询、下载和导出数据 | CLI | 统一远端取数、本地数据库和结构化输出 |
| 想长期保存历史行情并用 SQL 研究 | marketdb | 在本地自动构建和维护 DuckDB 数据库 |
| 想获取全市场、长时间范围的大批量数据 | CLI / Market Dumps | 大结果落盘，避免终端和 Agent 上下文过载 |

---

## 数据能力概览

| 数据 / 能力 | 可以解决的问题 | 推荐入口 |
| --- | --- | --- |
| A股最新行情快照 | 查询单只、多只或全市场股票的最新价格与交易数据 | CLI / API / MCP / Python |
| A股历史 K 线 | 获取股票历史走势，支持研究、回测和趋势分析 | CLI / marketdb |
| 公司行动与复权 | 查询分红、送转等公司行动，并生成前复权、后复权数据 | CLI / marketdb |
| 财务报表与财务指标 | 查询利润表、资产负债表、现金流量表和五类财务指标 | CLI / API / MCP / Python |
| A 股估值快照 | 批量查询市盈率 TTM/MRQ、市净率 MRQ、市销率 TTM 和市现率 TTM | CLI / API / MCP / Python |
| 标的目录 | 根据股票名称、代码或关键词查找唯一 `thscode` | CLI / API / MCP / Python |
| 交易日历 | 判断交易日、安排数据同步和回测时间 | CLI / API / MCP / Python |
| 指数与板块 | 查询指数和板块目录、成分股、行情及历史 K 线 | CLI / API / MCP / Python |
| 同花顺特色数据 | 获取涨停池、连板、异动、热榜和龙虎榜 | CLI / API / MCP / Python |
| 公募基金 | 查询资料、披露持仓、净值、收益、持有人结构、ETF/LOF 快照与 ETF 日线 | CLI / API / MCP / Python |
| 全市场数据导出 | 下载全量或增量日 K、公司行动等标准数据文件 | CLI / Market Dumps |
| 本地 DuckDB | 完成数据初始化、同步、校验、修复、SQL 查询和导出 | CLI / marketdb |

> 分钟 K、tick、海外行情、宏观数据、新闻公告原文和研报目前不在公开能力范围内。请求未支持的数据时，应明确说明，不使用模拟数据或静态示例冒充真实结果。

---

## 快速开始

### 1. 获取统一 API Key

登录 [同花顺金融数据服务官网](https://fuyao.aicubes.cn/)，进入 [API Key 管理](https://fuyao.aicubes.cn/admin/) 创建 Key。

API、MCP、CLI 和 Python 远端取数共用同一个 API Key。统一推荐保存为用户级环境变量 `HITHINK_FINANCE_API_KEY`；`hithink-finance` Skill 也能读取用户级 `credentials.env`，具体路径与各平台配置命令见 [Skill 的 CLI 安装说明](skills/hithink-finance/references/cli/setup.md)。

优先使用隐藏输入或环境变量。也可以把刚获取的 Key 交给 Agent 代为配置；Agent 不应复述 Key，并且只能写入用户级凭据来源，不能写入代码、日志、公开配置或 Git 仓库。

---

### 2. 优先安装 `hithink-finance` Skill

Skill 是 Agent 使用本项目的统一说明书，包含：

- 接入方式选择；
- API、MCP、CLI 和 Python 快速路径；
- 股票名称与代码消歧规则；
- 完整 API 契约镜像；
- 安全与合规要求；
- 大结果落盘和上下文控制规范。

请选择一种安装方式：

1. **优先：通过 `npx skills add` 安装（推荐）**

   ```bash
   npx skills add HiThink-Tech/Financial-API --skill hithink-finance -g --yes
   ```

2. **无网络条件：从 [Skill Hub](https://www.skillhub.cn/skills/hithink-finance) 安装**

   **将提示词发送给你的 AI 安装该 Skill：**

   ```text
   请根据 https://skillhub.cn/install/skillhub.md，安装 hithink-finance。
   ```

如无法使用以上安装方式，也可以把完整的 [`skills/hithink-finance/`](skills/hithink-finance/SKILL.md) 目录复制到 Agent 文档声明的 Skills 发现目录。

> 必须保留 `references/`，不要只复制 `SKILL.md`。

安装完成后重新打开会话，可以直接描述需求，例如：

```text
查询贵州茅台的最新行情，并分析近一年的涨跌幅、最大回撤和均线趋势。
```

```text
获取沪深300当前成分股，并将结果保存为本地文件。
```

```text
查询宁德时代最近四期利润表和主要盈利指标，注明报告期和数据来源。
```

---

### 3. CLI：人类与 Agent 的默认推荐

CLI 将远端取数、本地数据库、认证、统一 JSON 输出和大结果落盘整合到一个命令入口。

优先从 npm 安装：

```bash
npm install -g @hithink-tech/hithink-finance-cli
```

国内用户可使用 [npmmirror](https://npmmirror.com/) 镜像加速：

```bash
npm install -g @hithink-tech/hithink-finance-cli --registry=https://registry.npmmirror.com
```

安装完成后验证：

```bash
hithink-finance auth login
hithink-finance capabilities --format json
```

- `auth login`：安全录入 API Key。
- `capabilities`：查看此版本 CLI 支持的机器可读能力目录。
- `--format json`：返回稳定、统一的 JSON 格式，方便程序或 Agent 继续处理。

通过 Skill 使用时，Agent 会先复用统一凭据，再通过 stdin 完成 CLI 登录；已有 CLI 凭据需要更新时使用 `auth login --api-key-stdin --replace` 原子替换，无需用户再次输入。CLI 仍将副本保存在自己的系统凭据库中，因此脱离 Skill 后也可独立使用。

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

# 使用 SQL 查询本地前复权日线
hithink-finance db query \
  --sql "SELECT * FROM v_daily_qfq LIMIT 10" \
  --format json
```

仅在参与仓库开发或 npm 暂不可用时从源码验证：

```bash
cd hithink-finance-cli
npm ci --ignore-scripts
npm run build
node dist/cli/main.js capabilities --format json
node dist/cli/main.js doctor --format json
```

完整说明见 [`hithink-finance-cli/README.md`](hithink-finance-cli/README.md)。

---

### 4. REST API：适合业务系统和自定义开发

REST API 通过标准 HTTP 请求提供数据，适合：

- 接入网站、App 和后台服务；
- 使用 Java、Go、JavaScript、Python 等任意语言；
- 自定义数据获取和任务编排；
- 将金融数据嵌入已有业务流程。

使用 `curl` 查询贵州茅台最新行情：

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/prices/snapshot?thscodes=600519.SH' \
  -H 'X-api-key: <API_KEY>'
```

仓库内 REST API 契约入口：

- [REST API 文档](docs/api/README.md)
- 上游完整机器可读契约：<https://fuyao.aicubes.cn/llms-full.txt>

`docs/api/` 是仓库内唯一的上游 REST API 契约来源，其他文档不重复维护字段定义。

---

### 5. MCP：最快接入 Chat Bot 和 IDE

MCP 适合 Claude Desktop、Cursor、Windsurf 和其他支持 MCP 的客户端。

将以下四个托管端点配置到客户端，并使用 `hithink-finance-*` 作为服务名称：

```json
{
  "mcpServers": {
    "hithink-finance-a-share": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share",
      "headers": {
        "X-api-key": "${HITHINK_FINANCE_API_KEY}"
      }
    },
    "hithink-finance-a-share-index": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share-index",
      "headers": {
        "X-api-key": "${HITHINK_FINANCE_API_KEY}"
      }
    },
    "hithink-finance-meta": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/meta",
      "headers": {
        "X-api-key": "${HITHINK_FINANCE_API_KEY}"
      }
    },
    "hithink-finance-fund": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/fund",
      "headers": {
        "X-api-key": "${HITHINK_FINANCE_API_KEY}"
      }
    }
  }
}
```

四个服务分别覆盖：

- `hithink-finance-a-share`：A股行情、财务和特色数据；
- `hithink-finance-a-share-index`：指数、板块及相关行情；
- `hithink-finance-meta`：标的检索、能力发现等基础信息。
- `hithink-finance-fund`：基金资料、披露、净值、收益和场内行情。

配置位置、安全方式、意图路由和验证步骤见 [MCP 接入说明](docs/mcp.md)。

Skill 已内置工具功能快照。只有在实际调用或排查参数变化时，才需要读取当前 MCP 连接的 `tools/list`。

---

### 6. Python SDK：适合二次开发与量化研究

安装 Python 子项目：

```bash
python -m pip install -e ./python
```

通过仓库脚本检索股票并查询行情：

```bash
python python/toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"
python python/toolkit/fuyao/scripts/fuyao.py prices-snapshot --thscodes 600519.SH
```

Python 子项目适合：

- Notebook 数据探索；
- 研究脚本；
- 定时取数；
- 自定义分页和重试策略；
- 与 pandas、NumPy、回测框架等工具组合；
- 将远端 API 数据与本地数据库数据一起使用。

完整说明：

- [Python README](python/README.md)
- [toolkit 路由](python/toolkit/README.md)
- [Python 可执行示例](python/examples/README.md)

---

### 7. marketdb：在本地保存和研究历史数据

marketdb 会在本地构建 DuckDB 数据库，适合：

- 保存长期历史行情；
- 自动执行全量初始化和增量更新；
- 查询前复权、后复权和原始行情；
- 构建全市场研究面板；
- 使用 SQL 快速筛选数据；
- 将结果导出为文件；
- 检查和修复本地数据状态。

初始化：

```bash
python python/bootstrap.py
```

查看本地数据库状态：

```bash
marketdb status --json --db data/market.duckdb
```

查询贵州茅台最近十个交易日的前复权收盘价：

```bash
marketdb query \
  --json \
  --db data/market.duckdb \
  --sql "SELECT date, close
         FROM v_daily_qfq
         WHERE thscode='600519.SH'
         ORDER BY date DESC
         LIMIT 10"
```

完整说明见 [`python/toolkit/marketdb/README.md`](python/toolkit/marketdb/README.md)。

---

## 常见使用流程

### 场景一：查询一只股票的最新行情

1. 用户提供股票名称或代码。
2. 先通过标的检索确认唯一 `thscode`。
3. 调用最新行情接口。
4. 返回价格、涨跌幅、成交数据、数据时间和来源。

推荐入口：CLI / API / MCP / Python。

---

### 场景二：分析一只股票的历史趋势

1. 将股票名称或不完整代码转换为唯一 `thscode`。
2. 获取近一年或指定时间范围的历史日 K。
3. 计算区间涨跌幅、均线、波动和最大回撤。
4. 注明时间范围、复权口径、数据源和“非投资建议”。

推荐入口：CLI / marketdb / Python。

---

### 场景三：查询上市公司财务数据

1. 确认股票代码。
2. 查询利润表、资产负债表或现金流量表。
3. 根据需求补充财务指标。
4. 明确报告期、数据发布日期和口径。

推荐入口：CLI / API / MCP / Python。

---

### 场景四：准备量化研究数据

1. 判断数据范围是否属于全市场、多标的或多年历史数据。
2. 大规模结果使用 CLI 或 Market Dumps 落盘。
3. 使用 marketdb 构建和增量同步本地数据库。
4. 通过 SQL 或 Python 生成研究面板、因子数据和导出文件。

推荐入口：CLI / marketdb / Python。

---

### 场景五：让 AI Agent 自动完成取数

1. 安装 `hithink-finance` Skill。
2. Agent 检测当前环境中可用的 API、MCP、CLI 和 Python 能力。
3. 根据数据新鲜度、任务规模和输出形式选择工具。
4. 对大结果自动落盘，仅在对话中返回路径、行数和摘要。
5. 真实数据不可用时明确报告原因，不使用模拟数据替代。

推荐入口：Skill。

---

## AI Agent 使用约定

进入仓库的 Agent 按以下顺序读取：

1. [`AGENTS.md`](AGENTS.md)
2. [`skills/hithink-finance/SKILL.md`](skills/hithink-finance/SKILL.md)
3. 与实际接入方式对应的一个详细入口

执行时遵守以下规则：

- 用户只提供股票名称、简称或不完整代码时，先消歧为唯一 `thscode`，不要猜测交易所后缀。
- 最新、当天、财报、指数和特色数据优先使用远端能力。
- 本地已有且足够新的历史行情优先使用 DuckDB，减少重复下载。
- 全市场、多年、多标的或分页全集必须落盘，只在对话中返回文件路径、行数和摘要。
- 输出需要注明数据源、时间范围、报告期和复权口径。
- 真实数据不可用时明确说明原因，不使用模拟数据或静态示例冒充。
- 金融分析结果需要注明“非投资建议”。

---

## 示例与灵感

### Python 可执行示例

[`python/examples/`](python/examples/README.md) 提供 SDK、marketdb 和远端数据组合示例。

### 金融看板灵感

[`examples/inspirations/`](examples/inspirations/README.md) 提供可以复制使用的 Prompt、预览图和静态 HTML。

### 默认示例：单股行情与趋势速览

[![单股行情与趋势速览](examples/inspirations/01-stock-overview/preview.jpg)](examples/inspirations/01-stock-overview/README.md)

该示例从一只股票出发，组合展示：

- 最新行情；
- 近一年日 K；
- 均线；
- 区间表现；
- 最大回撤；
- 可以继续追问和探索的研究方向。

查看：

- [完整说明与 Prompt](examples/inspirations/01-stock-overview/README.md)
- [直接打开静态 HTML](examples/inspirations/01-stock-overview/example.html)

> 示例用于说明数据组合方式，不是数据能力契约、投资建议或固定视觉标准。

---

## 当前公开能力边界

当前公开能力主要覆盖：

- A股最新行情快照；
- A股历史日 K；
- 标的目录；
- 公司行动与复权；
- 财务报表与指标；
- 交易日历；
- 指数与板块；
- 涨停、连板、异动、热榜和龙虎榜；
- 全市场日 K 与公司行动数据文件；
- 本地 DuckDB 数据同步和研究。

当前暂不公开提供：

- 分钟 K；
- tick 数据；
- 海外市场行情；
- 宏观经济数据；
- 新闻和公告原文；
- 研报原文。

数据权限、调用频率和可访问 capability 以官网与账号授权为准。

---

## 最新变化

当前 monorepo 版本包含四项关键变化，完整历史见 [`CHANGELOG.md`](CHANGELOG.md)。

### 1. 新增公募基金能力

REST API、MCP、CLI 与 Python SDK 统一支持基金资料、披露持仓、净值、区间收益、持有人结构、ETF/LOF 快照和 ETF 历史日线。

### 2. 新增 `hithink-finance` Node.js CLI

统一提供：

- 远端数据查询；
- 本地 DuckDB；
- 稳定 JSON 输出；
- 能力发现；
- 环境诊断；
- 数据初始化、更新、校验和修复。

推荐直接从 npm 安装。

### 3. 新增统一 `hithink-finance` Skill

原根目录中的通用、REST、MCP 和 CLI Setup Skills 已合并为一个可以独立安装的入口，统一覆盖：

- API；
- MCP；
- CLI；
- Python SDK；
- 安全与大结果处理规范。

### 4. 仓库升级为 monorepo

Python 项目已迁入 `python/`。

旧版用户和 Agent 需要先按照 [Monorepo 版本升级指南](docs/monorepo-migration.md) 更新：

- editable 安装路径；
- 脚本路径；
- CI 配置；
- Prompt 中的仓库路径。

本地数据库和 `.env` 不需要迁移。

---

## 项目结构

```text
docs/                    公共文档中心；docs/api 是上游 REST 契约唯一来源
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

---

## 文档与契约治理

- 根 README 负责产品介绍、接入导航和完整能力总览。
- 详细参数下沉到对应子目录 README 或 `docs/`。
- `docs/api/` 是仓库内上游 REST API 契约的唯一来源。
- `skills/hithink-finance/references/api.md`、`references/api/`、`references/mcp.md` 与 `references/mcp/` 由 `python scripts/sync_skill_contracts.py` 生成，确保 Skill 独立发布时仍然自包含。
- Python 和 CLI 文档只维护各自的运行方式、命令和适配语义，不重复维护上游字段契约。
- 旧版迁移以 [Monorepo 版本升级指南](docs/monorepo-migration.md) 为准。

---

## 验证

在仓库根目录执行：

```bash
python scripts/sync_skill_contracts.py --check
python -m pytest python/tests/
```

验证 Node.js CLI：

```bash
cd hithink-finance-cli
npm run verify
```

---

## 安全与合规

- 所有远端方式共用 API Key。
- API Key 只能通过安全输入、用户级环境变量或凭据文件、stdin、系统凭据库或客户端 Secret 传入。
- 不要把 API Key 写入代码、README、Issue、Prompt、日志、产物或 Git commit。
- 全市场、多年、多标的等大结果必须落盘，避免终端、日志和 Agent 上下文泄露或膨胀。
- 不使用模拟数据、示例数据或静态内容冒充真实金融数据。
- 本项目提供金融数据访问和研究数据准备工具，不提供投资建议。
- 数据权限、调用频率和可访问 capability 以官网与账号授权为准。

---

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

---

## License

本仓库采用 [MIT License](LICENSE)。
