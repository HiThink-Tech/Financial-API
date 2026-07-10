---
name: hithink-finance-special-data
description: '用于 Agent 通过 hithink-finance CLI 查询特色数据：涨停池、连板天梯、个股异动、异动原因、飙升榜、热股榜、热度历史/趋势、龙虎榜、游资和机构榜；普通行情转 hithink-finance-market。'
---

# hithink-finance-special-data

特色榜单和事件型数据入口。强调窗口约束和榜单口径，不替代普通行情或财报。

## 前置条件表

| 条件                                   | 操作                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 开始任何 CLI 调用                      | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md)                             |
| 不确定命令是否存在或参数是否变化       | 运行 `hithink-finance capabilities --format json`，再运行 `hithink-finance schema <id> --format json` |
| 需要执行下表某个命令                   | 先读取对应 reference 文件，不要只凭命令名猜参数                                                       |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                         |

## 快速决策

| 用户意图                     | 首选命令 / 路由                 |
| ---------------------------- | ------------------------------- |
| 今日异动列表/异动标签        | `special anomaly-list`，仅今日  |
| 最多 50 只股票的今日异动原因 | `special anomaly-stock`，仅今日 |
| 涨停池分页                   | `special limit-up-pool`         |
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
| [special limit-up-ladder](references/special-limit-up-ladder.md)     | Query the 30-day limit-up ladder                        |
| [special limit-up-pool](references/special-limit-up-pool.md)         | Query the limit-up stock pool                           |
| [special skyrocket](references/special-skyrocket.md)                 | Query the skyrocket ranking                             |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance special <command> --help
```

使用原生命令前必须先看 schema；schema 是当前 CLI 参数契约，reference 是决策和边界补充。

## 权限表

| 命令类型                       | 要求                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| 远端服务查询                   | API Key 来自系统凭据库、`HITHINK_FINANCE_API_KEY` 或 `--api-key-stdin` |
| 本地 DuckDB 查询/导出          | 本地库存在且 schema 兼容；可用全局 `--db <path>` 指定                  |
| 删除、迁移、修复等有副作用操作 | 先预览或说明影响；需要用户明确确认时才加 `--yes`                       |

## 边界声明

- today-only 能力不能补历史；用户要历史时说明边界并选择有历史窗口的命令。
- 榜单热度不是投资建议，不要扩写成推荐或确定性原因。
