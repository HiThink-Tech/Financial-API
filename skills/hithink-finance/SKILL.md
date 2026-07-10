---
name: hithink-finance
description: 当用户或 Agent 需要通过同花顺金融数据服务获取、查询、同步、分析或导出 A 股行情、财报、指数、板块、特色数据或本地 DuckDB 数据，或需要选择、安装、配置、诊断 REST API、MCP、hithink-finance CLI、Python SDK/marketdb 时使用。
---

# hithink finance

这是“同花顺金融数据服务”的统一 Agent 入口和主路由。它负责识别需求、探测当前能力、处理配置边界并选择接入方式；选定方式后只读取对应的一级入口，由该入口继续按需披露详细契约。

## 路由流程

1. 明确数据、资产类别、时间范围、新鲜度、复权口径、结果规模和输出形式。
2. 只做无副作用的当前环境探测，不要求用户重复安装：
   - 当前会话是否已连接 `hithink-finance-a-share`、`hithink-finance-a-share-index` 或 `hithink-finance-meta` MCP。
   - PATH 中是否存在 `hithink-finance`；存在时读取 `hithink-finance --version`，不要先升级。
   - 用户是否正在 Python/Notebook 项目、是否已有 `marketdb`，或是否明确要求 Python。
   - 是否只有 HTTP/curl 环境，或用户明确要求自行集成。
3. 根据任务和能力边界选择一种主路径；不要为了“完整”而同时安装或探测全部工具。
4. 只读取下表对应的一个一级 reference，再由该入口路由到其子目录契约。
5. 执行后报告数据源、时间范围、口径、行数、输出路径与线上验证边界。

## 接入方式决策

| 场景 | 首选 | 一级入口 |
| --- | --- | --- |
| 人类终端、Agent 执行、自动化、远端与本地数据一体化 | CLI | [cli.md](references/cli.md) |
| Chat/IDE 会话已连接托管服务 | MCP | [mcp.md](references/mcp.md) |
| 零依赖 HTTP、自定义脚本、服务端集成 | REST API | [api.md](references/api.md) |
| Python、Notebook、研究流程或已有 marketdb | Python SDK | [python-sdk.md](references/python-sdk.md) |

CLI 高度封装远端取数、本地 DuckDB、结构化输出和大结果落盘，对人类与 Agent 都友好。MCP 最适合 Chat 场景。REST API 可塑性最高。Python SDK 适合二次开发和研究。

## API Key 与配置边界

所有远端方式共用在 <https://fuyao.aicubes.cn/admin> 获取的 API Key。

- 不得要求用户把 API Key 粘贴到对话，也不得写入代码、Prompt、日志、公开配置、输出或 Git。
- CLI 交互使用 `hithink-finance auth login` 的隐藏输入；Agent/CI 使用该工具支持的 stdin、进程环境变量或凭据机制。
- MCP 使用客户端 Secret 或环境变量插值；REST/Python 使用进程环境变量或调用环境的 Secret 管理。
- 安装、升级、修复、卸载、凭据写入和数据清理会改变环境；执行前必须获得用户授权。状态检查、版本检查和帮助读取可直接进行。

## 通用执行契约

- 用户给名称、不完整代码或不确定资产类别时，先消歧为唯一 `thscode`，不要猜 `.SH`、`.SZ`、`.BJ` 或指数类型。
- 最新行情、财报、指数和特色数据走远端；本地已有且足够新的历史 OHLCV、复权、面板和 SQL 优先走本地数据库。
- REST/MCP 的成功条件是业务信封 `code=0`；CLI 的成功条件是退出码 0 且 JSON 结构化信封 `ok=true`。
- 全市场、分页全集、长时间窗口或多标的结果必须落盘，只报告路径、行数、窗口和摘要。
- 真实数据不可用时报告原因；不得使用相似数据、静态示例或模拟数据冒充。
- 分析结果注明数据源、时间、报告期、复权口径和“非投资建议”。
- 离线契约只能证明支持范围，不能证明当前会话已连接或账号有权限；线上可用性必须通过实际授权请求验证。

## 故障路由

- CLI 不存在、版本异常、认证未配置或内置 Skills 不完整：进入 [CLI 入口](references/cli.md)。
- MCP 未连接、认证失败或需要识别工具意图：进入 [MCP 入口](references/mcp.md)。
- REST 参数、字段或错误码不明确：进入 [API 入口](references/api.md)。
- Python 安装、远端 toolkit 或本地 marketdb 问题：进入 [Python SDK 入口](references/python-sdk.md)。
