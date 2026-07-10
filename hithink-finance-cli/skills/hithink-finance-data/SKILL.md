---
name: hithink-finance-data
description: '用于 Agent 通过 hithink-finance CLI 管理本地 DuckDB：初始化、同步、状态、校验、迁移、修复、清理、删除、只读 SQL、导出；远端实时数据转对应业务 skill。'
---

# hithink-finance-data

本地数据生命周期和 SQL 入口。负责让数据可用、可校验、可导出，而不是解释所有研究结论。

## 前置条件表

| 条件                                   | 操作                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 开始任何 CLI 调用                      | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md)                             |
| 不确定命令是否存在或参数是否变化       | 运行 `hithink-finance capabilities --format json`，再运行 `hithink-finance schema <id> --format json` |
| 需要执行下表某个命令                   | 先读取对应 reference 文件，不要只凭命令名猜参数                                                       |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                         |

## 快速决策

| 用户意图               | 首选命令 / 路由                         |
| ---------------------- | --------------------------------------- |
| 首次建库或从 dump 导入 | `data init`                             |
| 增量/重新同步本地数据  | `data sync`                             |
| 查看库路径和 schema    | `data status`                           |
| 质量校验               | `data validate`                         |
| 迁移计划或应用         | `data migrate`                          |
| 重建复权等派生数据     | `data repair`                           |
| 清理下载缓存           | `data clean`                            |
| 删除本地库             | `data remove --plan` 先预览             |
| 查看表/视图            | `db describe`                           |
| 只读 SQL 查询          | `db query --sql <sql>`                  |
| 大结果导出             | `db export --sql <sql> --output <file>` |

## Shortcuts

| 命令                                         | 何时使用                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [data clean](references/data-clean.md)       | 只清理 CLI 管理的下载缓存，不删除数据库。                                                                                                                                      |
| [data init](references/data-init.md)         | 远端初始化需要 API Key；执行前先运行 `hithink-finance auth status --format json`，未登录时到 https://fuyao.aicubes.cn/admin 获取 API Key 并运行 `hithink-finance auth login`。 |
| [data migrate](references/data-migrate.md)   | 默认只输出迁移计划；应用迁移前让用户确认。                                                                                                                                     |
| [data remove](references/data-remove.md)     | 高风险操作；先运行 `--plan` 报告路径和大小。                                                                                                                                   |
| [data repair](references/data-repair.md)     | 用于重建派生复权因子等本地派生数据。                                                                                                                                           |
| [data status](references/data-status.md)     | 本地库不存在时用于确认默认路径和 schema 状态。                                                                                                                                 |
| [data sync](references/data-sync.md)         | 需要 API Key；执行前先运行 `hithink-finance auth status --format json`，未登录时到 https://fuyao.aicubes.cn/admin 获取 API Key 并运行 `hithink-finance auth login`。           |
| [data validate](references/data-validate.md) | 用于同步、迁移、研究导出前的质量门禁。                                                                                                                                         |
| [db describe](references/db-describe.md)     | 查询本地 DuckDB 表和视图清单。                                                                                                                                                 |
| [db export](references/db-export.md)         | 用于大结果或下游 pandas/notebook 消费。                                                                                                                                        |
| [db query](references/db-query.md)           | 只读 SQL；小结果才可直接读取 JSON。                                                                                                                                            |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance data <command> --help
hithink-finance db <command> --help
```

使用原生命令前必须先看 schema；schema 是当前 CLI 参数契约，reference 是决策和边界补充。

## 权限表

| 命令类型                       | 要求                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| 远端服务查询                   | API Key 来自系统凭据库、`HITHINK_FINANCE_API_KEY` 或 `--api-key-stdin` |
| 本地 DuckDB 查询/导出          | 本地库存在且 schema 兼容；可用全局 `--db <path>` 指定                  |
| 删除、迁移、修复等有副作用操作 | 先预览或说明影响；需要用户明确确认时才加 `--yes`                       |

## 边界声明

- SQL 必须只读；写入、DDL、删除或外部副作用不属于 `db query`。
- 删除数据库或清除数据前先用 plan/状态输出让用户确认，真正删除需要显式 `--yes`。
- 查询结果很多时用 `db export --output <file>`，不要回显全表。
