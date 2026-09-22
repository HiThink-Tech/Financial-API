---
name: hithink-finance-index
description: '用于 Agent 通过 hithink-finance CLI 查询同花顺指数/概念/行业/地域/特色指数目录、指数成分股、指数快照和指数历史；个股行情转 hithink-finance-market，股票代码搜索转 hithink-finance-symbol。'
---

# hithink-finance-index

指数目录、指数成分和指数行情入口。只处理指数对象及其成分关系。

## 前置条件表

| 条件                         | 操作                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 首次使用本域                 | 读取 [共享规则](../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用                         |
| 首次执行或版本变化           | 查看 `capabilities --format json` 与目标 `schema <id> --format json`；组合规则不明确时查看 `--help` |
| 需要执行下表某个命令         | 先读取对应 reference 文件，不要只凭命令名猜参数                                                     |
| 全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘，只报告摘要                                                   |

## 快速决策

| 用户意图                      | 首选命令 / 路由               |
| ----------------------------- | ----------------------------- |
| 找概念/行业/地域/特色指数目录 | `index catalog`               |
| 查某个指数成分股              | `index constituents`          |
| 查指数实时快照                | `index snapshot`              |
| 查指数历史日线                | `index history`               |
| 查个股历史/快照               | 切到 `hithink-finance-market` |

## Shortcuts

| 命令                                                   | 何时使用                     |
| ------------------------------------------------------ | ---------------------------- |
| [index catalog](references/index-catalog.md)           | List THS indices by category |
| [index constituents](references/index-constituents.md) | Query index constituents     |
| [index history](references/index-history.md)           | Query daily index history    |
| [index snapshot](references/index-snapshot.md)         | Query index price snapshots  |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance index <command> --help
```

schema 提供当前命令选项；reference 补充业务参数关系和验收方法。全局参数、凭据与输出约定见共享规则。

## 边界声明

- 指数代码通常是 `000000.SH/SZ/BJ/TI` 形式；不要把 A 股股票 thscode 当指数代码。
- 成分股结果是指数成员关系，不等于用户的投资组合或推荐清单。
