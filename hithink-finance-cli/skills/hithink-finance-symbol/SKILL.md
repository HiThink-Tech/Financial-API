---
name: hithink-finance-symbol
description: '通过 hithink-finance CLI 搜索股票、指数、基金、期货和期权等标的，将名称或 ticker 消歧为 thscode，并导出 A 股或指数代码表；行情和成分查询转对应业务 Skill。'
---

# hithink-finance-symbol

标的识别和代码表路由。目标是把自然语言名称、ticker、thscode 或代码表需求变成后续可执行的证券标识。

## 前置条件表

| 条件                         | 操作                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 首次使用本域                 | 读取 [共享规则](../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用                         |
| 首次执行或版本变化           | 查看 `capabilities --format json` 与目标 `schema <id> --format json`；组合规则不明确时查看 `--help` |
| 需要执行下表某个命令         | 先读取对应 reference 文件，不要只凭命令名猜参数                                                     |
| 全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘，只报告摘要                                                   |

## 快速决策

| 用户意图                           | 首选命令 / 路由                                     |
| ---------------------------------- | --------------------------------------------------- |
| 用户给出名称/简称/ticker，需要消歧 | `symbol search`                                     |
| 用户要股票或指数代码表/全量目录    | `symbol list --output <file>`，按页保存并核对完整性 |
| 用户要价格、K 线、快照             | 切到 `hithink-finance-market`                       |
| 用户要指数成分或指数行情           | 切到 `hithink-finance-index`                        |

## Shortcuts

| 命令                                         | 何时使用                             |
| -------------------------------------------- | ------------------------------------ |
| [symbol list](references/symbol-list.md)     | List symbols with bounded pagination |
| [symbol search](references/symbol-search.md) | Resolve a name or code to thscode    |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance symbol <command> --help
```

schema 提供当前命令选项；reference 补充业务参数关系和验收方法。全局参数、凭据与输出约定见共享规则。

## 边界声明

- 只解决“标的是什么”。不要在本 skill 内回答价格、涨跌幅、财报或策略结论。
- 名称搜索可能返回多个候选；用于后续精确查询前必须让用户意图或字段证据完成消歧。
