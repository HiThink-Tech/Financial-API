# CLI 内置 Skills 路由

当 `hithink-finance` 已安装且本次确定使用 CLI 时，先用 `hithink-finance skills status --format json` 找到官方 `canonical` 来源，直接读取下列 Skills 中与意图匹配的一份及其所需 references。它们由 CLI 包发布和维护，是 CLI 命令契约的首选来源。客户端发现状态与文件读取分开判断；同步问题按 [安装、配置与生命周期](setup.md) 处理。

| 用户意图 | 读取的内置 Skill | 主要职责 |
| --- | --- | --- |
| 名称、ticker、代码消歧与代码表 | `hithink-finance-symbol` | `symbol search/list` |
| 行情、K 线、公司行为、交易日历、面板 | `hithink-finance-market` | `market *` 与远端/本地路由 |
| 利润表、资产负债表、现金流量表、指标 | `hithink-finance-financials` | `financials *` |
| A 股市盈率、市净率、市销率和市现率快照 | `hithink-finance-valuation` | `valuation *` |
| 指数/板块目录、成分与行情 | `hithink-finance-index` | `index *` |
| 涨停、异动、热榜、龙虎榜 | `hithink-finance-special-data` | `special *` |
| 基金资料、净值、收益、持仓、持有人、ETF/LOF 快照与 ETF 历史日线 | `hithink-finance-fund` | `fund *` |
| 期货品种、合约、持仓、仓单、基差、交易日程与行情 | `hithink-finance-futures` | `futures *` |
| 期权品种、合约与行情 | `hithink-finance-options` | `options *` |
| 建库、同步、状态、校验、修复、SQL、导出 | `hithink-finance-data` | `data *` 与 `db *` |
| 多步骤研究、口径组合与大结果工作流 | `hithink-finance-research` | 跨领域研究编排 |
| 认证、全局规则、Skills 与生命周期 | `hithink-finance-shared` | `auth/skills/doctor/update/uninstall` |

## 读取规则

- 单一领域只读一个领域 Skill；跨领域研究再增加 `hithink-finance-research`。
- 认证、输出信封、生命周期或共用配置问题读取 `hithink-finance-shared`。
- 内置 Skill 与运行时帮助冲突时，用 `hithink-finance capabilities --format json`、`schema <command-id>` 和具体命令 `--help` 校验当前安装。
- 未安装 CLI 或包内官方内容不可用时进入 [安装、配置与生命周期](setup.md)；仅目标同步异常时继续读取 `canonical`，不手工复制或覆盖冲突目录。
