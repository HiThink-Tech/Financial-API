---
name: hithink-finance-market
description: '用于 Agent 通过 hithink-finance CLI 获取 A 股集合竞价快照与短期基准、普通行情快照、历史 K 线、交易日历、复权因子、公司行动和本地全市场面板；涨跌停、炸板、热榜、龙虎榜、异动和游资机构榜转 hithink-finance-special-data。'
---

# hithink-finance-market

普通行情和本地行情派生能力。优先使用本地库覆盖的历史/面板能力，必要时走远端同花顺金融数据服务。

## 前置条件表

| 条件                                   | 操作                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 开始任何 CLI 调用                      | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md)                             |
| 不确定命令是否存在或参数是否变化       | 运行 `hithink-finance capabilities --format json`，再运行 `hithink-finance schema <id> --format json` |
| 需要执行下表某个命令                   | 先读取对应 reference 文件，不要只凭命令名猜参数                                                       |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘；远端 stdout 只返回摘要                                         |

## 快速决策

| 用户意图                                   | 首选命令 / 路由                                        |
| ------------------------------------------ | ------------------------------------------------------ |
| 单票历史日线/K 线                          | `market history`；`--source auto` 会在本地覆盖时走本地 |
| 实时或分页行情快照                         | `market snapshot`                                      |
| 集合竞价实时/终态快照                      | `market auction-snapshot`                              |
| 集合竞价短期基准                           | `market auction-benchmark`                             |
| 交易日历                                   | `market calendar`                                      |
| 复权因子                                   | `market adjustment-factors`                            |
| 公司行动/除权除息事件                      | `market corporate-actions`                             |
| 全市场区间面板/批量研究输入                | `market panel --output <file>`                         |
| 涨跌停池、炸板池、连板、热股、龙虎榜、异动 | 切到 `hithink-finance-special-data`                    |

## Shortcuts

| 命令                                                                 | 何时使用                                                                                                                      |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [market adjustment-factors](references/market-adjustment-factors.md) | 查询本地日级复权因子；需要本地库。                                                                                            |
| [market auction-benchmark](references/market-auction-benchmark.md)   | Query the short-term auction benchmark; omit date for the Asia/Shanghai current date and read resolved date/date_ms from data |
| [market auction-snapshot](references/market-auction-snapshot.md)     | Query auction snapshots whose timestamp is the response assembly timestamp                                                    |
| [market calendar](references/market-calendar.md)                     | Query the one-year A-share trading calendar                                                                                   |
| [market corporate-actions](references/market-corporate-actions.md)   | Query adjustment events                                                                                                       |
| [market history](references/market-history.md)                       | Query daily A-share history                                                                                                   |
| [market panel](references/market-panel.md)                           | 需要本地库覆盖请求窗口；适合作为研究样本输入。                                                                                |
| [market snapshot](references/market-snapshot.md)                     | Query A-share price snapshots                                                                                                 |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance market <command> --help
```

使用原生命令前必须先看 schema；schema 是当前 CLI 参数契约，reference 是决策和边界补充。

## 权限表

| 命令类型                       | 要求                                                                   |
| ------------------------------ | ---------------------------------------------------------------------- |
| 远端服务查询                   | API Key 来自系统凭据库、`HITHINK_FINANCE_API_KEY` 或 `--api-key-stdin` |
| 本地 DuckDB 查询/导出          | 本地库存在且 schema 兼容；可用全局 `--db <path>` 指定                  |
| 删除、迁移、修复等有副作用操作 | 先预览或说明影响；需要用户明确确认时才加 `--yes`                       |

## 边界声明

- 不提供投资建议、买卖判断或收益承诺；只返回数据或中立统计。
- 全市场、长区间、多标的结果必须落盘，只汇报路径、行数和关键元信息。
