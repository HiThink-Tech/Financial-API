---
name: hithink-finance-index
description: '用于 Agent 通过 hithink-finance CLI 查询同花顺指数/概念/行业/地域/特色指数目录、指数成分股、指数快照和指数历史；个股行情转 hithink-finance-market，股票代码搜索转 hithink-finance-symbol。'
---

# hithink-finance-index

指数目录、指数成分和指数行情入口。只处理指数对象及其成分关系。

## 前置条件表

| 条件                                   | 操作                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 开始任何 CLI 调用                      | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md)                             |
| 不确定命令是否存在或参数是否变化       | 运行 `hithink-finance capabilities --format json`，再运行 `hithink-finance schema <id> --format json` |
| 需要执行下表某个命令                   | 先读取对应 reference 文件，不要只凭命令名猜参数                                                       |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                         |

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

使用原生命令前必须先看 schema；schema 是当前 CLI 参数契约，reference 是决策和边界补充。

## 权限表

| 命令类型                       | 要求                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| 远端服务查询                   | API Key 来自系统凭据库、`HITHINK_FINANCE_API_KEY` 或 `--api-key-stdin` |
| 本地 DuckDB 查询/导出          | 本地库存在且 schema 兼容；可用全局 `--db <path>` 指定                  |
| 删除、迁移、修复等有副作用操作 | 先预览或说明影响；需要用户明确确认时才加 `--yes`                       |

## 边界声明

- 指数代码通常是 `000000.SH/SZ/BJ/TI` 形式；不要把 A 股股票 thscode 当指数代码。
- 成分股结果是指数成员关系，不等于用户的投资组合或推荐清单。
