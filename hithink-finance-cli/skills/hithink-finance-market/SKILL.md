---
name: hithink-finance-market
description: '用于 Agent 通过 hithink-finance CLI 获取 A 股集合竞价快照与短期基准、普通行情快照、历史 K 线、交易日历、复权因子、公司行动和本地全市场面板；涨跌停、炸板、热榜、龙虎榜、异动和游资机构榜转 hithink-finance-special-data。'
---

# hithink-finance-market

普通行情和本地行情派生能力。优先使用本地库覆盖的历史/面板能力，必要时走远端同花顺金融数据服务。

## 前置条件表

| 条件                         | 操作                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 首次使用本域                 | 读取 [共享规则](../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用                         |
| 首次执行或版本变化           | 查看 `capabilities --format json` 与目标 `schema <id> --format json`；组合规则不明确时查看 `--help` |
| 需要执行下表某个命令         | 先读取对应 reference 文件，不要只凭命令名猜参数                                                     |
| 全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘，只报告摘要                                                   |

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

schema 提供当前命令选项；reference 补充业务参数关系和验收方法。全局参数、凭据与输出约定见共享规则。

## 边界声明

- 不提供投资建议、买卖判断或收益承诺；只返回数据或中立统计。
- 全市场、长区间、多标的结果必须落盘，只汇报路径、行数和关键元信息。
