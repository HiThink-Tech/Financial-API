---
name: hithink-finance-fund
description: '用于 Agent 通过 hithink-finance CLI 查询基金档案、持仓、净值、区间收益、持有人结构、ETF/LOF 快照和 ETF 历史；A 股行情转 hithink-finance-market，基金代码搜索转 hithink-finance-symbol。'
---

# hithink-finance-fund

基金基础信息、业绩、持有人和场内行情入口。根据基金类型与市场形态选择稳定命令。

## 前置条件表

| 条件                                   | 操作                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 开始任何 CLI 调用                      | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md)                             |
| 不确定命令是否存在或参数是否变化       | 运行 `hithink-finance capabilities --format json`，再运行 `hithink-finance schema <id> --format json` |
| 需要执行下表某个命令                   | 先读取对应 reference 文件，不要只凭命令名猜参数                                                       |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                         |

## 快速决策

| 用户意图           | 首选命令 / 路由               |
| ------------------ | ----------------------------- |
| 基金档案           | `fund profile`                |
| 基金持仓           | `fund holdings`               |
| 基金净值           | `fund nav`                    |
| 基金区间收益       | `fund returns`                |
| 基金持有人结构     | `fund holders`                |
| ETF/LOF 快照       | `fund snapshot`               |
| ETF 历史日线       | `fund history`                |
| 基金代码或名称搜索 | 切到 `hithink-finance-symbol` |

## Shortcuts

| 命令                                         | 何时使用                                        |
| -------------------------------------------- | ----------------------------------------------- |
| [fund history](references/fund-history.md)   | Query daily ETF price history                   |
| [fund holders](references/fund-holders.md)   | Query fund holder structure by disclosure scope |
| [fund holdings](references/fund-holdings.md) | Query fund portfolio holdings                   |
| [fund nav](references/fund-nav.md)           | Query fund net asset value series               |
| [fund profile](references/fund-profile.md)   | Query fund profile detail                       |
| [fund returns](references/fund-returns.md)   | Query fund interval returns                     |
| [fund snapshot](references/fund-snapshot.md) | Query exchange-traded fund market snapshot      |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance fund <command> --help
```

使用原生命令前必须先看 schema；schema 是当前 CLI 参数契约，reference 是决策和边界补充。

## 权限表

| 命令类型                       | 要求                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| 远端服务查询                   | API Key 来自系统凭据库、`HITHINK_FINANCE_API_KEY` 或 `--api-key-stdin` |
| 本地 DuckDB 查询/导出          | 本地库存在且 schema 兼容；可用全局 `--db <path>` 指定                  |
| 删除、迁移、修复等有副作用操作 | 先预览或说明影响；需要用户明确确认时才加 `--yes`                       |

## 边界声明

- 档案、持仓、净值、收益和持有人查询必须同时提供单个 `fund_type` 与 `thscode`。
- `fund snapshot` 只支持 ETF/LOF；`fund history` 只支持 ETF、固定 `1d` 且窗口最多 5 年。
- 基金数据不是投资建议，不要据此扩写买卖或收益承诺。
