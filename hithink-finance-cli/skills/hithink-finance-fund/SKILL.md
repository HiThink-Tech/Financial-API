---
name: hithink-finance-fund
description: '用于 Agent 通过 hithink-finance CLI 查询基金档案、公司、经理、财务、诊断、资讯、募集、持仓、净值、收益、持有人结构、ETF/LOF 快照和 ETF 历史；A 股行情转 hithink-finance-market，基金代码搜索转 hithink-finance-symbol。'
---

# hithink-finance-fund

基金资料、机构与经理、财务、业绩、披露和场内行情入口。根据基金类型、标识来源与市场形态选择稳定命令。

## 前置条件表

| 条件                                   | 操作                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 开始任何 CLI 调用                      | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md)                             |
| 不确定命令是否存在或参数是否变化       | 运行 `hithink-finance capabilities --format json`，再运行 `hithink-finance schema <id> --format json` |
| 需要执行下表某个命令                   | 先读取对应 reference 文件，不要只凭命令名猜参数                                                       |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                         |

## 快速决策

| 用户意图                       | 首选命令 / 路由                                                            |
| ------------------------------ | -------------------------------------------------------------------------- |
| 基金档案                       | `fund profile`                                                             |
| 基金持仓                       | `fund holdings`                                                            |
| 基金净值                       | `fund nav`                                                                 |
| 基金区间收益                   | `fund returns`                                                             |
| 基金持有人结构                 | `fund holders`                                                             |
| 基金公司详情                   | `fund company-detail`                                                      |
| 基金经理资料/经历/业绩/风格    | `fund manager-detail/manager-experience/manager-performance/manager-style` |
| 基金财务指标/利润表/资产负债表 | `fund financial-indicators/income-statements/balance-sheets`               |
| 基金诊断                       | `fund diagnostics`                                                         |
| 基金资讯                       | `fund news`                                                                |
| 在售或待售基金                 | `fund offerings`                                                           |
| 历史股票/债券持仓              | 先用对应 `report-dates`，再调用 `stock-history` 或 `bond-history`          |
| ETF/LOF 快照                   | `fund snapshot`                                                            |
| ETF 历史日线                   | `fund history`                                                             |
| 基金代码或名称搜索             | 切到 `hithink-finance-symbol`                                              |

## Shortcuts

| 命令                                                                 | 何时使用                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [fund asset-allocation](references/fund-asset-allocation.md)         | Query fund asset allocation                                                                                  |
| [fund balance-sheets](references/fund-balance-sheets.md)             | Query fund balance sheets                                                                                    |
| [fund bond-history](references/fund-bond-history.md)                 | Query historical fund bond holdings                                                                          |
| [fund bond-report-dates](references/fund-bond-report-dates.md)       | Query fund bond holding report dates                                                                         |
| [fund company-detail](references/fund-company-detail.md)             | Query fund company detail                                                                                    |
| [fund diagnostics](references/fund-diagnostics.md)                   | Query fund diagnostics                                                                                       |
| [fund dividends](references/fund-dividends.md)                       | Query fund dividend records                                                                                  |
| [fund drawdowns](references/fund-drawdowns.md)                       | Query fund drawdown periods                                                                                  |
| [fund financial-indicators](references/fund-financial-indicators.md) | Query fund financial indicators                                                                              |
| [fund history](references/fund-history.md)                           | Query daily ETF price history                                                                                |
| [fund holders](references/fund-holders.md)                           | Query fund holder structure by disclosure scope                                                              |
| [fund holdings](references/fund-holdings.md)                         | Query fund portfolio holdings                                                                                |
| [fund income-statements](references/fund-income-statements.md)       | Query fund income statements                                                                                 |
| [fund indicators-history](references/fund-indicators-history.md)     | Query historical fund performance indicators with data timestamp/item only and no top-level thscode/interval |
| [fund industry-allocation](references/fund-industry-allocation.md)   | Query fund industry allocation                                                                               |
| [fund manager-detail](references/fund-manager-detail.md)             | Query fund manager detail                                                                                    |
| [fund manager-experience](references/fund-manager-experience.md)     | Query fund manager experience                                                                                |
| [fund manager-performance](references/fund-manager-performance.md)   | Query fund manager performance                                                                               |
| [fund manager-style](references/fund-manager-style.md)               | Query fund manager investment style                                                                          |
| [fund nav](references/fund-nav.md)                                   | Query fund net asset value series                                                                            |
| [fund news](references/fund-news.md)                                 | Query cursor-paginated public fund article metadata with has_more and no total                               |
| [fund offerings](references/fund-offerings.md)                       | Query active or upcoming fund offerings                                                                      |
| [fund profile](references/fund-profile.md)                           | Query fund profile detail                                                                                    |
| [fund returns](references/fund-returns.md)                           | Query fund interval returns                                                                                  |
| [fund snapshot](references/fund-snapshot.md)                         | Query exchange-traded fund market snapshot                                                                   |
| [fund stock-history](references/fund-stock-history.md)               | Query historical fund stock holdings                                                                         |
| [fund stock-report-dates](references/fund-stock-report-dates.md)     | Query fund stock holding report dates                                                                        |
| [fund top-holders](references/fund-top-holders.md)                   | Query top fund holders                                                                                       |

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
