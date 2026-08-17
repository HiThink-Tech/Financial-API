# hithink-finance CLI

`hithink-finance` 是同花顺金融数据服务的 Node.js 命令行客户端，面向人类终端、AI Agent、CI 和自动化脚本。它统一提供远端数据、本地 DuckDB、认证、结构化输出、能力发现、诊断和生命周期管理，运行时不依赖 monorepo 的 Python 子项目。

CLI 文档只维护命令和运行语义；上游 REST 参数与响应字段统一见 [`docs/api/`](../docs/api/README.md)。

## 环境与安装

需要 Node.js `>=22.12.0`。

### 从当前仓库运行

```bash
cd hithink-finance-cli
npm ci --ignore-scripts
npm run build
node dist/cli/main.js --help
node dist/cli/main.js capabilities --format json
```

### npm 发布后安装

```bash
npm install -g @hithink-tech/hithink-finance-cli
hithink-finance version --format json
hithink-finance doctor --format json
```

如果 `npm install` 返回 `E404`，说明包尚未发布或当前 registry 无法访问。报告实际状态，不要在终端指引中把源码安装伪装成正式发布安装。

## API Key 与认证

远端命令使用统一 API Key，获取地址：<https://fuyao.aicubes.cn/admin>。

交互式终端：

```bash
hithink-finance auth login
hithink-finance auth status --format json
```

Agent/CI 使用 stdin 或进程环境变量：

```bash
printf '%s' "$HITHINK_FINANCE_API_KEY" | \
  hithink-finance auth login --api-key-stdin --format json
```

统一 `hithink-finance` Skill 会先读取 `HITHINK_FINANCE_API_KEY` 或用户级凭据文件，再通过 stdin 将同一个 Key 安全同步到 CLI。已有 CLI 凭据需要更新时使用：

```bash
printf '%s' "$HITHINK_FINANCE_API_KEY" | \
  hithink-finance auth login --api-key-stdin --replace --format json
```

CLI 仍把凭据副本保存在系统凭据库中，保持脱离 Skill 后的独立完整性；`--replace` 直接覆盖成功后才生效，不需要先 `logout`。

不要把 Key 写入配置文件、命令参数记录、日志、Markdown、对话或 Git。`config show` 只展示非敏感配置。

## 能力发现

CLI 的当前命令事实由运行时输出提供：

```bash
hithink-finance capabilities --format json
hithink-finance schema market.snapshot --format json
hithink-finance market snapshot --help
```

Agent 不应只凭 README 猜参数。先读取 `capabilities`，再对目标 capability 读取 `schema`。

## 命令导航

| 命令组                          | 用途                                                 |
| ------------------------------- | ---------------------------------------------------- |
| `version`, `doctor`             | 版本和环境诊断                                       |
| `auth`, `config`                | API Key 与非敏感配置                                 |
| `symbol`                        | 标的检索与代码表                                     |
| `market`                        | 个股行情、集合竞价、交易日历、本地面板和复权因子     |
| `financials`                    | 财务报表与财务指标                                   |
| `index`                         | 指数/板块目录、成分和行情                            |
| `fund`                          | 基金档案、公司、经理、持仓、财务、资讯和场内行情     |
| `valuation`                     | A 股当前市盈率、市净率、市销率和市现率估值快照       |
| `special`                       | 涨停、跌停、炸板、连板、异动、热榜和龙虎榜           |
| `data`                          | 本地数据库初始化、同步、状态、校验、迁移、修复和清理 |
| `db`                            | DuckDB 描述、只读 SQL 和导出                         |
| `capabilities`, `schema`        | 机器可读命令契约                                     |
| `skills`, `update`, `uninstall` | Agent Skills 与 CLI 生命周期                         |

常见调用：

```bash
hithink-finance symbol search --q 600519 --limit 5 --format json
hithink-finance market snapshot --thscodes 600519.SH --format json
hithink-finance market auction-snapshot --thscodes 600519.SH --stage final --format json
hithink-finance financials income --thscode 600519.SH --limit 4 --format json
hithink-finance index constituents --thscode 000300.SH --format json
hithink-finance fund nav --fund-type otc --thscode 025480.OF --range year --format json
hithink-finance fund manager-detail --manager-id <id> --format json
hithink-finance valuation snapshot --thscodes 600519.SH,000001.SZ --format json
hithink-finance special limit-break-pool --size 50 --format json
hithink-finance data status --format json
hithink-finance db query --sql "SELECT * FROM v_daily_qfq LIMIT 10" --format json
```

## 输出与错误语义

- 机器读取显式使用 `--format json`；人类交互可选择 `table`。
- 成功以进程退出码 0 和 JSON 信封 `ok=true` 为准。
- 失败以非 0 退出码和 `ok=false` 为准，读取 `error.code`、`error.category`、`error.hint` 与请求标识。
- 远端上游使用 `{code, message, request_id, data}`，但 CLI 会规范化为自己的信封；不要混用两套成功判断。
- `--debug` 只向 stderr 输出诊断，不污染机器可读 stdout。

## 大结果与数据源

`--source auto|local|remote` 控制支持该选项的行情路由。只有具体命令声明的 `--output <path>` 才能直接落盘，它不是全局选项。

```bash
hithink-finance market panel \
  --start 2026-01-01 --end 2026-01-31 \
  --output panel.parquet --file-format parquet --format json

hithink-finance db export \
  --sql "SELECT * FROM v_daily_qfq" \
  --output daily.parquet --file-format parquet --format json
```

全市场、分页全集、多标的或长时间窗口必须落盘。终端和 Agent 对话只报告路径、行数、窗口和摘要。

## 本地 DuckDB

```bash
hithink-finance data init --format json
hithink-finance data sync --format json
hithink-finance data status --format json
hithink-finance data validate --format json
hithink-finance db describe --format json
```

初始化和同步需要远端 API Key；已有本地库的只读查询通常不需要。迁移、修复、清理和卸载等有副作用操作先查看计划或帮助，并在命令要求时获得用户明确确认。

远端初始化和同步下载数据包时，交互终端会在 stderr 动态刷新进度；stderr 被重定向时会输出开始、完成及节流后的进度日志（至少相隔 5 秒且新增 8 MiB）。无论何种模式，`--format json` 的结果信封都只写入 stdout。

## 配置优先级

CLI 按以下顺序解析非敏感配置：

1. CLI 参数
2. 环境变量
3. 项目 `hithink-finance.config.json`
4. 用户配置
5. 默认值

使用 `hithink-finance config show --format json` 查看最终生效的非敏感配置。多套环境使用 `--profile <name>`。

## Agent Skill

跨 REST API、MCP、CLI 和 Python SDK 的统一入口是仓库根 [`skills/hithink-finance`](../skills/hithink-finance/SKILL.md)：

```bash
npx skills add HiThink-Tech/Financial-API --skill hithink-finance -g --yes
```

CLI 包还可以通过 `hithink-finance skills status|sync|remove` 管理命令专用的领域 Skills。它们补充 CLI 参数路由，不替代统一 `hithink-finance` Skill，也不是上游 API 文档的事实源。

## 开发与验证

```bash
npm ci --ignore-scripts
npm run generate:contracts
npm run verify
node scripts/release-smoke.mjs
```

- 改动命令、选项、输出或错误语义后，先运行 `npm run generate:contracts` 更新 CLI 自带能力与 Skill 契约。
- `npm run verify` 依次检查格式、lint、类型、测试和构建。
- 发布流程与许可守门见 [`docs/maintainers/npm-publishing.md`](docs/maintainers/npm-publishing.md)。
- 版本变化见 [`CHANGELOG.md`](CHANGELOG.md)，安全问题按 [`SECURITY.md`](SECURITY.md) 私下报告。
