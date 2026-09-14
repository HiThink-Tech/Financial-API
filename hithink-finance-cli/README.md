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

### 更新与修复

```bash
hithink-finance update --check --format json
hithink-finance update --format json
hithink-finance update --target-version <version> --format json
hithink-finance update --repair --format json
```

`update --check` 只检查版本；直接运行 `update` 会查询 npm latest 并更新到对应的精确版本。`--target-version` 用于安装指定版本或回滚，`--repair` 仅重新安装当前版本；这三个选项互斥。

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

`--api-key <value>` 仅为兼容旧脚本保留，已从帮助中隐藏并会输出弃用警告；它可能把密钥暴露到 shell 历史和进程列表。新调用应使用隐藏输入、`--api-key-stdin` 或 `HITHINK_FINANCE_API_KEY`。

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

| 命令组                          | 用途                                                                    |
| ------------------------------- | ----------------------------------------------------------------------- |
| `version`, `doctor`             | 版本、认证、配置、DuckDB、数据锁和内置 Skills 诊断                      |
| `auth`, `config`                | API Key 与非敏感配置                                                    |
| `symbol`                        | 标的检索与代码表                                                        |
| `market`                        | 个股行情、集合竞价、交易日历、本地面板和复权因子                        |
| `financials`                    | 财务报表与财务指标                                                      |
| `index`                         | 指数/板块目录、成分和行情                                               |
| `fund`                          | 基金档案、公司、经理、持仓、财务、资讯、回测、指标、QDII 额度和场内行情 |
| `futures`                       | 期货品种、合约、持仓、仓单、基差、日程与行情                            |
| `options`                       | 期权品种、合约与行情                                                    |
| `valuation`                     | A 股当前市盈率、市净率、市销率和市现率估值快照                          |
| `special`                       | 涨停、跌停、炸板、连板、异动、热榜和龙虎榜                              |
| `data`                          | 本地数据库初始化、同步、状态、校验、迁移、修复和清理                    |
| `db`                            | DuckDB 描述、只读 SQL 和导出                                            |
| `capabilities`, `schema`        | 机器可读命令契约                                                        |
| `skills`, `update`, `uninstall` | Agent Skills 与 CLI 生命周期                                            |

常见调用：

```bash
hithink-finance symbol search --q 600519 --limit 5 --format json
hithink-finance market snapshot --thscodes 600519.SH --format json
hithink-finance market auction-snapshot --thscodes 600519.SH --stage final --format json
hithink-finance financials income --thscode 600519.SH --limit 4 --format json
hithink-finance index constituents --thscode 000300.SH --format json
hithink-finance fund nav --thscode 025480.OF --range year --format json
hithink-finance fund manager-detail --manager-id <id> --format json
hithink-finance fund backtest-indicators --format json
hithink-finance fund quota-list --tab '["nazhi100"]' --buy true --format json
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
- `--debug` 或 `DEBUG=hithink-finance*` 会在错误信封的 `meta.diagnostics` 中附加已脱敏的 request ID 与堆栈；错误信封仍只写 stderr，不污染机器可读 stdout。非预期内部错误还会返回预填版本、命令、错误码和 request ID 的 `error.report_url`。

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

下载校验在流式写盘过程中增量计算 SHA-256，不会为了哈希再次把完整 dump 读入内存。DuckDB 默认最多使用 4 个线程，内存上限按系统内存的 50% 计算并限制在 256 MiB 至 4 GiB，以满足带主键索引的增量导入与事务提交；可用 `HITHINK_FINANCE_DUCKDB_THREADS` 和 `HITHINK_FINANCE_DUCKDB_MEMORY_LIMIT`（例如 `2GiB`）覆盖。只读查询会响应终止信号；数据导入提交后仍先完成复权、元数据和质量一致性收尾。

stdin 输入受大小保护：API Key 最多 16 KiB，批量证券代码最多 1 MiB。超限返回 `CLI_STDIN_TOO_LARGE`，不会继续缓存输入。

Skills、更新和卸载的前台子进程均有执行时限。Windows 使用 `taskkill /t /f`，POSIX 使用独立进程组的 `SIGTERM`/`SIGKILL` 终止整棵前台进程树；超时返回 `CLI_CHILD_TIMEOUT`。普通命令的 detached 更新检查由跨进程租约保护，同一状态目录最多一个刷新任务。

## 配置优先级

CLI 按以下顺序解析非敏感配置：

1. CLI 参数
2. 环境变量
3. 项目 `hithink-finance.config.json`
4. 用户配置
5. 默认值

自动发现的项目配置可以不存在；通过 `--config` 或 `HITHINK_FINANCE_CONFIG` 显式指定文件时，该文件必须存在，否则返回 `CONFIG_NOT_FOUND`。

使用 `hithink-finance config show --format json` 查看最终生效的非敏感配置。多套环境使用 `--profile <name>`。

## Agent Skill lifecycle

跨 REST API、MCP、CLI 和 Python SDK 的统一入口是仓库根 [`skills/hithink-finance`](../skills/hithink-finance/SKILL.md)：

```bash
npx skills add HiThink-Tech/Financial-API --skill hithink-finance -g --yes
```

CLI 包通过 `hithink-finance skills status|sync|remove` 管理 12 个命令专用领域 Skills。它们补充统一 `hithink-finance` 总 Skill 的路由，不替代总 Skill 或上游 API 契约。

首次全局安装采用保存的 `auto` 策略：检测已安装的 Codex、Claude Code、Cursor、Gemini CLI、OpenCode、GitHub Copilot CLI、Trae、WorkBuddy 和 QClaw，并只向检测到的客户端同步。仅存在旧 `skills` 目录不算安装证据；未检测到任何客户端时不会创建一批 Agent 根目录。CLI 升级和 `update` 会复用同一策略自动更新。

默认将内容发布到 CLI 用户级数据目录，再为每个目标的每个 Skill 建立目录链接（Windows 为 junction，其他平台为 symlink），因此多 Agent 只共享一份内容。`status --format json` 实际校验共享内容和逐目标文件；`ready` 不代表客户端已加载，新增后可能需要刷新或新建会话。

### Fallback Agent Skills installation

如果 npm 使用了 `--ignore-scripts`，优先在安装完成后执行：

```bash
hithink-finance skills sync --repair --format json
```

如果 CLI 自动同步仍不可用，可以通过 `skills` 工具直接从 GitHub 子目录安装 12 个 CLI 配套领域 Skills。只指定实际使用的 Agent，例如：

```bash
npx skills add https://github.com/HiThink-Tech/Financial-API/tree/main/hithink-finance-cli/skills --skill '*' --agent codex --global --yes --full-depth
```

将 `codex` 替换为目标 Agent 名称；多个目标可重复传入 `--agent`，例如 `--agent codex --agent claude-code`。不要使用 `--all`，它等价于同时选择所有 Skills 和所有 Agent，会创建不需要的 Agent 目录。`npx skills` 当前可直接处理 Codex、Claude Code、Cursor、Gemini CLI、OpenCode、GitHub Copilot、Trae 和 Trae CN；WorkBuddy 与 QClaw 请使用 CLI 自动同步或下面的手工复制方式。

也可以 clone 仓库或下载 [GitHub 源码](https://github.com/HiThink-Tech/Financial-API)，找到 `hithink-finance-cli/skills/`，把其中每个 `hithink-finance-*` 完整目录直接复制到目标的 Skills 根目录：

| Agent              | Skills 根目录                                                                    |
| ------------------ | -------------------------------------------------------------------------------- |
| Codex              | `~/.codex/skills/`                                                               |
| Claude Code        | `~/.claude/skills/`                                                              |
| Cursor             | `~/.cursor/skills/`                                                              |
| Gemini CLI         | `~/.gemini/skills/`                                                              |
| OpenCode           | Windows：`%APPDATA%/opencode/skills/`；macOS/Linux：`~/.config/opencode/skills/` |
| GitHub Copilot CLI | `~/.copilot/skills/`                                                             |
| Trae / Trae CN     | `~/.trae/skills/` / `~/.trae-cn/skills/`                                         |
| WorkBuddy          | `~/.workbuddy/skills/`                                                           |
| QClaw              | `~/.qclaw/skills/`                                                               |

不要把外层 `skills/` 目录整体复制成目标目录下的下一层，也不要只复制 `SKILL.md`；每个 Skill 的 `references/` 必须完整保留。安装完成后刷新或新建 Agent 会话。通过 `npx skills` 安装时可用 `npx skills list --global --agent <name> --json` 核对；手工复制时应确认目标下 12 个 `hithink-finance-*` 目录均包含 `SKILL.md`。

这两种兜底方式不写入 CLI 的 Skills 所有权记录，因此不受 `hithink-finance skills status|sync|remove` 管理。以后如需切回 CLI 管理，应先移除手工安装的同名目录，再运行 `hithink-finance skills sync --agent <name> --format json`；CLI 不会覆盖未知或用户占用的目录。

```bash
# 追加目标，保留已有选择
hithink-finance skills sync --agent claude-code --format json
hithink-finance skills sync --agent workbuddy --agent qclaw --format json

# 回到自动检测；已显式添加的目标仍保留
hithink-finance skills sync --agent auto --format json

# 为一个已知客户端使用的目录设置持久化覆盖；仅在不兼容链接时使用复制模式
hithink-finance skills sync --agent cursor --directory <absolute-path> --copy --format json

# 查看、修复、移除
hithink-finance skills status --format json
hithink-finance skills sync --repair --format json
hithink-finance skills remove --agent codex --format json
```

安装时可设置 `HITHINK_FINANCE_SKILLS_AGENTS=auto` 或以逗号分隔的目标名称来替换保存策略；值必须非空且全部合法，`auto` 不能与名称混用。显式指定的目标即使尚未检测到客户端也会创建对应 Skills 根目录。`sync --agent <name>` 会解除该目标此前的排除状态。`remove --agent <name>` 只删除 CLI 托管内容并阻止自动模式再次添加；无 `--agent` 时移除全部托管内容并禁用后续自动重装，直到再次同步。

同步由互斥锁保护，先验证新共享内容再发布；单个目标失败不会把其他成功目标误报为失败。CLI 不覆盖未知或用户占用的同名目录。哈希未变的历史托管副本会在首次同步时自动迁移为共享链接，修改过的副本则保留并报告冲突；确认客户端不支持目录链接后，可为该目标显式使用 `--copy`。npm 使用 `--ignore-scripts` 时，安装后执行 `hithink-finance skills sync --repair --format json`。直接 `npm uninstall -g` 不保证生命周期清理，先执行 `hithink-finance skills remove`。

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
