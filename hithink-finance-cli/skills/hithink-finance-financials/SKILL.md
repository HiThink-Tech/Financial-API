---
name: hithink-finance-financials
description: '用于 Agent 通过 hithink-finance CLI 查询 A 股利润表、资产负债表、现金流量表、财务指标、年度/季度报告窗口；价格行情转 hithink-finance-market，指数财务不在本 skill 范围。'
---

# hithink-finance-financials

A 股财务报表和指标入口。把报告期、时间窗口和 limit 约束转成稳定命令。

## 前置条件表

| 条件                                   | 操作                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 开始任何 CLI 调用                      | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md)                             |
| 不确定命令是否存在或参数是否变化       | 运行 `hithink-finance capabilities --format json`，再运行 `hithink-finance schema <id> --format json` |
| 需要执行下表某个命令                   | 先读取对应 reference 文件，不要只凭命令名猜参数                                                       |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                         |

## 快速决策

| 用户意图                | 首选命令 / 路由               |
| ----------------------- | ----------------------------- |
| 利润表/收入成本利润项目 | `financials income`           |
| 资产负债结构            | `financials balance-sheet`    |
| 现金流量项目            | `financials cash-flow`        |
| 单个报告期的财务指标    | `financials indicators`       |
| 用户问价格或涨跌        | 切到 `hithink-finance-market` |

## Shortcuts

| 命令                                                               | 何时使用                                 |
| ------------------------------------------------------------------ | ---------------------------------------- |
| [financials balance-sheet](references/financials-balance-sheet.md) | Query balance-sheet financial statements |
| [financials cash-flow](references/financials-cash-flow.md)         | Query cash-flow financial statements     |
| [financials income](references/financials-income.md)               | Query income financial statements        |
| [financials indicators](references/financials-indicators.md)       | Query financial indicators for a report  |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance financials <command> --help
```

使用原生命令前必须先看 schema；schema 是当前 CLI 参数契约，reference 是决策和边界补充。

## 权限表

| 命令类型                       | 要求                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| 远端服务查询                   | API Key 来自系统凭据库、`HITHINK_FINANCE_API_KEY` 或 `--api-key-stdin` |
| 本地 DuckDB 查询/导出          | 本地库存在且 schema 兼容；可用全局 `--db <path>` 指定                  |
| 删除、迁移、修复等有副作用操作 | 先预览或说明影响；需要用户明确确认时才加 `--yes`                       |

## 边界声明

- 财务报表窗口最多 10 年；超过时拆分不重叠窗口并合并去重。
- `--limit` 与 `--start-ms/--end-ms` 互斥；不要同时传。
