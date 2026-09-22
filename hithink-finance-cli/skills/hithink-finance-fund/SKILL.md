---
name: hithink-finance-fund
description: '用于 Agent 通过 hithink-finance CLI 查询基金档案、公司、经理、财务、诊断、资讯、募集、持仓、净值、收益、持有人结构、在线回测、通用指标、QDII 额度、ETF/LOF 快照和 ETF 历史；A 股行情转 hithink-finance-market，基金代码搜索转 hithink-finance-symbol。'
---

# hithink-finance-fund

基金资料、机构与经理、财务、业绩、披露和场内行情入口。根据基金类型、标识来源与市场形态选择稳定命令。

## 前置条件表

| 条件                         | 操作                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 首次使用本域                 | 读取 [共享规则](../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用                         |
| 首次执行或版本变化           | 查看 `capabilities --format json` 与目标 `schema <id> --format json`；组合规则不明确时查看 `--help` |
| 需要执行下表某个命令         | 先读取对应 reference 文件，不要只凭命令名猜参数                                                     |
| 全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘，只报告摘要                                                   |

## 快速决策

| 用户意图                       | 首选命令 / 路由                                                             |
| ------------------------------ | --------------------------------------------------------------------------- |
| 基金档案                       | `fund profile`                                                              |
| 基金持仓                       | `fund holdings`                                                             |
| 基金净值                       | `fund nav`                                                                  |
| 基金区间收益                   | `fund returns`                                                              |
| 基金持有人结构                 | `fund holders`                                                              |
| 基金在线回测                   | 先用 `fund backtest-indicators` 获取指标规则，再调用 `fund backtest-result` |
| 基金画线/表格指标              | `fund indicators-line` / `fund indicators-table`                            |
| QDII 额度汇总/列表             | `fund quota-summary` / `fund quota-list`                                    |
| 基金公司详情                   | `fund company-detail`                                                       |
| 基金经理资料/经历/业绩/风格    | `fund manager-detail/manager-experience/manager-performance/manager-style`  |
| 基金财务指标/利润表/资产负债表 | `fund financial-indicators/income-statements/balance-sheets`                |
| 基金诊断                       | `fund diagnostics`                                                          |
| 基金资讯                       | `fund news`                                                                 |
| 在售或待售基金                 | `fund offerings`                                                            |
| 历史股票/债券持仓              | 先用对应 `report-dates`，再调用 `stock-history` 或 `bond-history`           |
| ETF/LOF 快照                   | `fund snapshot`                                                             |
| ETF 历史日线                   | `fund history`                                                              |
| 基金代码或名称搜索             | 切到 `hithink-finance-symbol`                                               |

## Shortcuts

| 命令                                                                 | 何时使用                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [fund asset-allocation](references/fund-asset-allocation.md)         | Query fund asset allocation                                                                                  |
| [fund backtest-indicators](references/fund-backtest-indicators.md)   | List indicators supported by the fund backtest service                                                       |
| [fund backtest-result](references/fund-backtest-result.md)           | Run a stateless online fund backtest                                                                         |
| [fund balance-sheets](references/fund-balance-sheets.md)             | Query fund balance sheets                                                                                    |
| [fund bond-history](references/fund-bond-history.md)                 | Query historical fund bond holdings; rank is populated only for the top 10                                   |
| [fund bond-report-dates](references/fund-bond-report-dates.md)       | Query fund bond holding report dates                                                                         |
| [fund company-detail](references/fund-company-detail.md)             | Query fund company detail                                                                                    |
| [fund diagnostics](references/fund-diagnostics.md)                   | Query fund diagnostics                                                                                       |
| [fund dividends](references/fund-dividends.md)                       | Query fund dividend records                                                                                  |
| [fund drawdowns](references/fund-drawdowns.md)                       | Query fund drawdown periods                                                                                  |
| [fund financial-indicators](references/fund-financial-indicators.md) | Query fund financial indicators                                                                              |
| [fund history](references/fund-history.md)                           | Query forward-adjusted daily ETF price history                                                               |
| [fund holders](references/fund-holders.md)                           | Query fund holder structure by disclosure scope                                                              |
| [fund holdings](references/fund-holdings.md)                         | Query fund portfolio holdings                                                                                |
| [fund income-statements](references/fund-income-statements.md)       | Query fund income statements                                                                                 |
| [fund indicators-history](references/fund-indicators-history.md)     | Query historical fund performance indicators with data timestamp/item only and no top-level thscode/interval |
| [fund indicators-line](references/fund-indicators-line.md)           | Query line-oriented fund indicators                                                                          |
| [fund indicators-table](references/fund-indicators-table.md)         | Query table-oriented fund indicators                                                                         |
| [fund industry-allocation](references/fund-industry-allocation.md)   | Query fund industry allocation                                                                               |
| [fund manager-detail](references/fund-manager-detail.md)             | Query fund manager detail                                                                                    |
| [fund manager-experience](references/fund-manager-experience.md)     | Query fund manager experience                                                                                |
| [fund manager-performance](references/fund-manager-performance.md)   | Query fund manager performance                                                                               |
| [fund manager-style](references/fund-manager-style.md)               | Query fund manager investment style                                                                          |
| [fund nav](references/fund-nav.md)                                   | Query fund net asset value series                                                                            |
| [fund news](references/fund-news.md)                                 | Query cursor-paginated public fund article metadata with has_more and no total                               |
| [fund offerings](references/fund-offerings.md)                       | Query active or upcoming fund offerings                                                                      |
| [fund profile](references/fund-profile.md)                           | Query fund profile detail                                                                                    |
| [fund quota-list](references/fund-quota-list.md)                     | Query QDII fund quotas by category                                                                           |
| [fund quota-summary](references/fund-quota-summary.md)               | Query QDII quota summaries by category                                                                       |
| [fund returns](references/fund-returns.md)                           | Query fund interval returns                                                                                  |
| [fund snapshot](references/fund-snapshot.md)                         | Query exchange-traded fund market snapshot                                                                   |
| [fund stock-history](references/fund-stock-history.md)               | Query historical fund stock holdings; rank is populated only for the top 10                                  |
| [fund stock-report-dates](references/fund-stock-report-dates.md)     | Query fund stock holding report dates                                                                        |
| [fund top-holders](references/fund-top-holders.md)                   | Query top fund holders                                                                                       |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance fund <command> --help
```

schema 提供当前命令选项；reference 补充业务参数关系和验收方法。全局参数、凭据与输出约定见共享规则。

## 边界声明

- 按基金查询的能力使用单个 `thscode` 唯一定位基金。
- 复杂对象和数组参数使用 JSON 字符串；绝对时间使用 Unix 毫秒，动态字段与局部空值保持原义。
- `fund snapshot` 只支持 ETF/LOF；`fund history` 只支持 ETF、固定 `1d` 且窗口最多 5 年。
- 基金数据不是投资建议，不要据此扩写买卖或收益承诺。
