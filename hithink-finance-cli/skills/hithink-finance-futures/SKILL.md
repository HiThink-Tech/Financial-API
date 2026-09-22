---
name: hithink-finance-futures
description: '通过 hithink-finance CLI 查询期货品种、合约详情、持仓、仓单、基差、交易日程、分时和日 K。'
---

# hithink-finance-futures

期货公开资料和行情入口。按完整 thscode、品种与日期语义选择稳定命令。

## 前置条件表

| 条件                         | 操作                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 首次使用本域                 | 读取 [共享规则](../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用                         |
| 首次执行或版本变化           | 查看 `capabilities --format json` 与目标 `schema <id> --format json`；组合规则不明确时查看 `--help` |
| 需要执行下表某个命令         | 先读取对应 reference 文件，不要只凭命令名猜参数                                                     |
| 全市场、分页、多标的或长区间 | 使用命令声明的 `--output <path>` 落盘，只报告摘要                                                   |

## 快速决策

| 用户意图       | 首选命令 / 路由                                                                 |
| -------------- | ------------------------------------------------------------------------------- |
| 期货品种       | `futures varieties`                                                             |
| 合约详情       | `futures contract-detail`                                                       |
| 品种或公司持仓 | `futures variety-positions` / `futures company-variety-positions`               |
| 合约持仓       | `futures contract-positions` / `futures contract-position-history`              |
| 仓单或基差     | `futures warehouse-receipts` / `futures latest-basis` / `futures basis-history` |
| 交易日程       | `futures trading-schedule`                                                      |
| 分时或日 K     | `futures intraday` / `futures daily`                                            |

## Shortcuts

| 命令                                                                                 | 何时使用                                           |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [futures basis-history](references/futures-basis-history.md)                         | Query historical futures basis                     |
| [futures commodity-indexes](references/futures-commodity-indexes.md)                 | List futures commodity indexes                     |
| [futures company-variety-positions](references/futures-company-variety-positions.md) | Query daily company positions by futures varieties |
| [futures contract-detail](references/futures-contract-detail.md)                     | Query futures contract details                     |
| [futures contract-position-history](references/futures-contract-position-history.md) | Query up to one year of futures contract positions |
| [futures contract-positions](references/futures-contract-positions.md)               | Query daily futures contract positions             |
| [futures contracts](references/futures-contracts.md)                                 | List futures contracts                             |
| [futures daily](references/futures-daily.md)                                         | Query fixed 1d futures prices                      |
| [futures intraday](references/futures-intraday.md)                                   | Query current futures session intraday prices      |
| [futures latest-basis](references/futures-latest-basis.md)                           | Query latest main-continuous futures basis         |
| [futures main](references/futures-main.md)                                           | List futures main contracts                        |
| [futures main-continuous](references/futures-main-continuous.md)                     | List futures main-continuous contracts             |
| [futures position-companies](references/futures-position-companies.md)               | List futures position companies                    |
| [futures secondary-main](references/futures-secondary-main.md)                       | List futures secondary-main contracts              |
| [futures session-timeline](references/futures-session-timeline.md)                   | Query futures session timeline                     |
| [futures trading-schedule](references/futures-trading-schedule.md)                   | Query futures trading schedule                     |
| [futures varieties](references/futures-varieties.md)                                 | List public futures varieties                      |
| [futures variety-plates](references/futures-variety-plates.md)                       | List futures variety plates                        |
| [futures variety-positions](references/futures-variety-positions.md)                 | Query daily futures variety positions              |
| [futures warehouse-receipts](references/futures-warehouse-receipts.md)               | Query historical futures warehouse receipts        |

## 原生命令与 schema

```bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
hithink-finance futures <command> --help
```

schema 提供当前命令选项；reference 补充业务参数关系和验收方法。全局参数、凭据与输出约定见共享规则。

## 边界声明

- 使用完整期货 thscode；品种代码必须大写并与合约匹配。
- 历史持仓开始日在调用日前一年内；daily 的 start/end 必须成对提供。
- 金融数值与日期允许 null，合法无数据数组保留为空数组。
