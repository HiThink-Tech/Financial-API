---
name: hithink-finance-symbol
description: '用于 Agent 通过 hithink-finance CLI 处理标的目录、股票/指数代码搜索、名称或 ticker 到 thscode 的消歧、A 股或指数代码表分页导出；行情价格转 hithink-finance-market，指数成分转 hithink-finance-index。'
---

# hithink-finance-symbol

标的识别和代码表路由。目标是把自然语言名称、ticker、thscode 或代码表需求变成后续可执行的证券标识。

## 前置条件表

| 条件                                   | 操作                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 开始任何 CLI 调用                      | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md)                             |
| 不确定命令是否存在或参数是否变化       | 运行 `hithink-finance capabilities --format json`，再运行 `hithink-finance schema <id> --format json` |
| 需要执行下表某个命令                   | 先读取对应 reference 文件，不要只凭命令名猜参数                                                       |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                         |

## 快速决策

| 用户意图                           | 首选命令 / 路由                                    |
| ---------------------------------- | -------------------------------------------------- |
| 用户给出名称/简称/ticker，需要消歧 | `symbol search`                                    |
| 用户要股票或指数代码表/全量目录    | `symbol list`，大结果必须将 JSON stdout 重定向落盘 |
| 用户要价格、K 线、快照             | 切到 `hithink-finance-market`                      |
| 用户要指数成分或指数行情           | 切到 `hithink-finance-index`                       |

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

使用原生命令前必须先看 schema；schema 是当前 CLI 参数契约，reference 是决策和边界补充。

## 权限表

| 命令类型                       | 要求                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| 远端服务查询                   | API Key 来自系统凭据库、`HITHINK_FINANCE_API_KEY` 或 `--api-key-stdin` |
| 本地 DuckDB 查询/导出          | 本地库存在且 schema 兼容；可用全局 `--db <path>` 指定                  |
| 删除、迁移、修复等有副作用操作 | 先预览或说明影响；需要用户明确确认时才加 `--yes`                       |

## 边界声明

- 只解决“标的是什么”。不要在本 skill 内回答价格、涨跌幅、财报或策略结论。
- 名称搜索可能返回多个候选；用于后续精确查询前必须让用户意图或字段证据完成消歧。
