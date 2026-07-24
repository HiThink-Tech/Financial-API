# CLI 内置 Skills 路由

当 `hithink-finance` 已安装且本次确定使用 CLI 时，先用 `hithink-finance skills status --format json` 找到官方 `canonical` 来源，再按 [安装、配置与生命周期](setup.md) 核验当前 Agent 的 Skills 目录中下列 Skills 可用，才读取与意图匹配的 Skill。`skills status` 不能证明当前 Agent 已发现这些目录。它们由 CLI 包发布和维护，是 CLI 命令契约的首选来源。

| 用户意图 | 读取的内置 Skill | 主要职责 |
| --- | --- | --- |
| 名称、ticker、代码消歧与代码表 | `hithink-finance-symbol` | `symbol search/list` |
| 行情、K 线、公司行为、交易日历、面板 | `hithink-finance-market` | `market *` 与远端/本地路由 |
| 利润表、资产负债表、现金流量表、指标 | `hithink-finance-financials` | `financials *` |
| A 股市盈率、市净率、市销率和市现率快照 | `hithink-finance-valuation` | `valuation *` |
| 指数/板块目录、成分与行情 | `hithink-finance-index` | `index *` |
| 涨停、异动、热榜、龙虎榜 | `hithink-finance-special-data` | `special *` |
| 基金资料、净值、收益、持仓、持有人、ETF/LOF 行情 | `hithink-finance-fund` | `fund *` |
| 建库、同步、状态、校验、修复、SQL、导出 | `hithink-finance-data` | `data *` 与 `db *` |
| 多步骤研究、口径组合与大结果工作流 | `hithink-finance-research` | 跨领域研究编排 |
| 认证、全局规则、Skills 与生命周期 | `hithink-finance-shared` | `auth/skills/doctor/update/uninstall` |

## 读取规则

- 单一领域只读一个领域 Skill；跨领域研究再增加 `hithink-finance-research`。
- 认证、输出信封、生命周期或共用配置问题读取 `hithink-finance-shared`。
- 内置 Skill 与运行时帮助冲突时，用 `hithink-finance capabilities --format json`、`schema <command-id>` 和具体命令 `--help` 校验当前安装。
- 未安装或状态异常时返回 [安装、配置与生命周期](setup.md) 修复，不使用本入口复制旧命令契约。
