---
name: hithink-finance-research
description: '用于 Agent 通过 hithink-finance CLI 基于已有本地数据做中立研究准备、面板导出、只读 SQL、描述性统计和可复现实证数据集；不用于实时取数、荐股、择时、组合建议或投资结论。'
---

# hithink-finance-research

研究工作流路由。它不拥有独立 `research` 命令，而是指导 Agent 组合 data、db 和 market panel 产出可复现数据证据。

## 前置条件表

| 条件                         | 操作                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 首次使用本域                 | 读取 [共享规则](../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用                         |
| 首次执行或版本变化           | 查看 `capabilities --format json` 与目标 `schema <id> --format json`；组合规则不明确时查看 `--help` |
| 需要执行下表某个命令         | 先读取对应 reference 文件，不要只凭命令名猜参数                                                     |
| 全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘，只报告摘要                                                   |

## 快速决策

| 用户意图                  | 首选命令 / 路由                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| 用户要构造研究样本/面板   | 先按 research-workflow 确认库文件与迁移计划，再校验质量、窗口和样本后导出 |
| 用户要 SQL 统计或因子分布 | 用 `db query` 小结果或 `db export` 大结果                                 |
| 用户要解释数据缺口        | 先 `data validate`，必要时 `data sync` 或 `data repair`                   |
| 用户要实时快照或最新榜单  | 切到对应业务 skill，不在 research 中直接取数                              |
| 用户要投资建议/策略推荐   | 拒绝给出建议，可提供中立数据分析边界                                      |

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

schema 提供当前命令选项；reference 补充业务参数关系和验收方法。全局参数、凭据与输出约定见共享规则。

## 边界声明

- 只做描述性、可复现、数据来源明确的研究辅助；不要生成买入/卖出/持有建议。
- 必须保留查询 SQL、输入文件路径、输出路径、行数和时间窗口，便于复核。
