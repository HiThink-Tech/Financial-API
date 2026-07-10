---
name: hithink-finance-research
description: '用于 Agent 通过 hithink-finance CLI 基于已有本地数据做中立研究准备、面板导出、只读 SQL、描述性统计和可复现实证数据集；不用于实时取数、荐股、择时、组合建议或投资结论。'
---

# hithink-finance-research

研究工作流路由。它不拥有独立 `research` 命令，而是指导 Agent 组合 data、db 和 market panel 产出可复现数据证据。

## 前置条件表

| 条件                                   | 操作                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 开始任何 CLI 调用                      | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md)                             |
| 不确定命令是否存在或参数是否变化       | 运行 `hithink-finance capabilities --format json`，再运行 `hithink-finance schema <id> --format json` |
| 需要执行下表某个命令                   | 先读取对应 reference 文件，不要只凭命令名猜参数                                                       |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                         |

## 快速决策

| 用户意图                  | 首选命令 / 路由                                                        |
| ------------------------- | ---------------------------------------------------------------------- |
| 用户要构造研究样本/面板   | 先 `data status` 和 `data validate`，再 `market panel --output <file>` |
| 用户要 SQL 统计或因子分布 | 用 `db query` 小结果或 `db export` 大结果                              |
| 用户要解释数据缺口        | 先 `data validate`，必要时 `data sync` 或 `data repair`                |
| 用户要实时快照或最新榜单  | 切到对应业务 skill，不在 research 中直接取数                           |
| 用户要投资建议/策略推荐   | 拒绝给出建议，可提供中立数据分析边界                                   |

## Shortcuts

| 命令                                                    | 何时使用                                     |
| ------------------------------------------------------- | -------------------------------------------- |
| [research-workflow.md](references/research-workflow.md) | 组合 data/db/market panel 做中立研究数据准备 |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance data <command> --help
hithink-finance db <command> --help
hithink-finance market panel --help
```

使用原生命令前必须先看 schema；schema 是当前 CLI 参数契约，reference 是决策和边界补充。

## 权限表

| 命令类型                       | 要求                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| 远端服务查询                   | API Key 来自系统凭据库、`HITHINK_FINANCE_API_KEY` 或 `--api-key-stdin` |
| 本地 DuckDB 查询/导出          | 本地库存在且 schema 兼容；可用全局 `--db <path>` 指定                  |
| 删除、迁移、修复等有副作用操作 | 先预览或说明影响；需要用户明确确认时才加 `--yes`                       |

## 边界声明

- 只做描述性、可复现、数据来源明确的研究辅助；不要生成买入/卖出/持有建议。
- 必须保留查询 SQL、输入文件路径、输出路径、行数和时间窗口，便于复核。
