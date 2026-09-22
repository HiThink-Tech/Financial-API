---
name: hithink-finance-valuation
description: '用于 Agent 通过 hithink-finance CLI 查询 A 股当前估值快照，包括市盈率、市净率、市销率和市现率；历史估值、ROE 和投资建议不在本 skill 范围。'
---

# hithink-finance-valuation

A 股当前估值快照入口。按用户给出的股票代码批量返回服务端口径的估值指标，不自行补算或扩展指标。

## 前置条件表

| 条件                         | 操作                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 首次使用本域                 | 读取 [共享规则](../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用                         |
| 首次执行或版本变化           | 查看 `capabilities --format json` 与目标 `schema <id> --format json`；组合规则不明确时查看 `--help` |
| 需要执行下表某个命令         | 先读取对应 reference 文件，不要只凭命令名猜参数                                                     |
| 全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘，只报告摘要                                                   |

## 快速决策

| 用户意图                       | 首选命令 / 路由                            |
| ------------------------------ | ------------------------------------------ |
| 查询一只或多只 A 股当前估值    | `valuation snapshot --thscodes <codes>`    |
| 用户给出名称或简称而非 thscode | 先切到 `hithink-finance-symbol` 完成消歧   |
| 用户要价格、涨跌或 K 线        | 切到 `hithink-finance-market`              |
| 用户要历史估值或 ROE           | 说明当前能力不支持，不得用其他字段臆算替代 |

## Shortcuts

| 命令                                                   | 何时使用                                |
| ------------------------------------------------------ | --------------------------------------- |
| [valuation snapshot](references/valuation-snapshot.md) | Query current A-share valuation metrics |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance valuation <command> --help
```

schema 提供当前命令选项；reference 补充业务参数关系和验收方法。全局参数、凭据与输出约定见共享规则。

## 边界声明

- `--thscodes` 最多接受 100 个原始逗号分隔 token；空 token 或非 A 股代码会被拒绝。
- 代码会转为大写并按首次出现顺序去重；估值字段允许为空或为负数，不要擅自过滤。
- 估值数据不是投资建议，不要据此扩写买卖、目标价或收益承诺。
