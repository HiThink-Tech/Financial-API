---
name: hithink-finance-special-data
description: '用于 Agent 通过 hithink-finance CLI 查询特色数据：涨停池、跌停池、炸板池、连板天梯、个股异动、异动原因、飙升榜、热股榜、热度历史/趋势、龙虎榜、游资和机构榜；普通行情转 hithink-finance-market。'
---

# hithink-finance-special-data

特色榜单和事件型数据入口。强调窗口约束和榜单口径，不替代普通行情或财报。

## 前置条件表

| 条件                         | 操作                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 首次使用本域                 | 读取 [共享规则](../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用                         |
| 首次执行或版本变化           | 查看 `capabilities --format json` 与目标 `schema <id> --format json`；组合规则不明确时查看 `--help` |
| 需要执行下表某个命令         | 先读取对应 reference 文件，不要只凭命令名猜参数                                                     |
| 全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘，只报告摘要                                                   |

## 快速决策

| 用户意图                     | 首选命令 / 路由                 |
| ---------------------------- | ------------------------------- |
| 今日异动列表/异动标签        | `special anomaly-list`，仅今日  |
| 最多 50 只股票的今日异动原因 | `special anomaly-stock`，仅今日 |
| 涨停池分页                   | `special limit-up-pool`         |
| 跌停池分页                   | `special limit-down-pool`       |
| 炸板池分页                   | `special limit-break-pool`      |
| 连板天梯                     | `special limit-up-ladder`       |
| 飙升榜                       | `special skyrocket`             |
| 当前热股榜                   | `special hot-stock`             |
| 历史热股榜                   | `special hot-stock-history`     |
| 单股热度趋势                 | `special hot-stock-trend`       |
| 龙虎榜/机构/游资             | `special dragon-tiger`          |

## Shortcuts

| 命令                                                                 | 何时使用                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| [special anomaly-list](references/special-anomaly-list.md)           | Query today-only anomaly analysis rows                  |
| [special anomaly-stock](references/special-anomaly-stock.md)         | Query today-only anomalies for up to 50 raw code tokens |
| [special dragon-tiger](references/special-dragon-tiger.md)           | Query dragon-tiger board records                        |
| [special hot-stock](references/special-hot-stock.md)                 | Query the current hot-stock ranking                     |
| [special hot-stock-history](references/special-hot-stock-history.md) | Query a historical hot-stock ranking                    |
| [special hot-stock-trend](references/special-hot-stock-trend.md)     | Query one stock hot-rank trend                          |
| [special limit-break-pool](references/special-limit-break-pool.md)   | Query the limit-break stock pool                        |
| [special limit-down-pool](references/special-limit-down-pool.md)     | Query the limit-down stock pool                         |
| [special limit-up-ladder](references/special-limit-up-ladder.md)     | Query the 30-day limit-up ladder                        |
| [special limit-up-pool](references/special-limit-up-pool.md)         | Query the limit-up stock pool                           |
| [special skyrocket](references/special-skyrocket.md)                 | Query the skyrocket ranking                             |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance special <command> --help
```

schema 提供当前命令选项；reference 补充业务参数关系和验收方法。全局参数、凭据与输出约定见共享规则。

## 边界声明

- today-only 能力不能补历史；用户要历史时说明边界并选择有历史窗口的命令。
- 榜单热度不是投资建议，不要扩写成推荐或确定性原因。
