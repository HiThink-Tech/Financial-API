---
name: financial-api
description: Use when a user or Agent needs to discover, query, analyze, export, or build outputs from financial data in this repository, including marketdb history, Fuyao snapshots, financials, indices, symbol lookup, SQL, dashboards, 涨停连板、个股异动、市场热榜、热度趋势或龙虎榜等本地与远端数据任务。
---

# Financial API Agent 入口

这是用户 Agent 使用本项目的第一入口。`toolkit/README.md` is the source of truth for current capability and routing; this skill defines how to enter and operate the project without duplicating the full API contract.

## 入口契约

1. 先读 `toolkit/README.md`，确认资产类别、数据类型、新鲜度、支持范围和推荐入口。
2. 再按任务读取一个具体入口，不要从目录名或历史记忆猜能力：
   - 本地历史行情、复权、面板、因子研究、SQL：`toolkit/marketdb/README.md`
   - 远端或新鲜数据、财报、指数、特色数据：`toolkit/fuyao/README.md`
   - 第一次使用、端到端样例、金融看板灵感：`examples/README.md`
3. 具体参数、字段、错误码和能力数量以 toolkit 当前文档为准。本 skill 只保留稳定的执行规则和能力线索。
4. 当前不支持的请求要明确说明，不得用相似数据、模拟数据或示例产物冒充真实结果。

## 快速路由

| 用户目标 | 使用入口 | 关键判断 |
| --- | --- | --- |
| 历史 OHLCV、复权行情、全市场面板、因子、回测前数据准备、任意 SQL | `toolkit/marketdb/README.md` | 数据已在 `data/market.duckdb` 或应落入本地库 |
| 最新行情、财报、财务指标、交易日历、代码表、指数、涨停/连板、个股异动、热榜、龙虎榜 | `toolkit/fuyao/README.md` | 数据实时、当天、本地缺失或属于远端元数据/特色数据 |
| 首次建库或本地库落后 | `toolkit/README.md` 的构建/更新路径 | 优先 dump/增量同步，不逐标的拉多年全市场数据 |
| 学习调用方式或制作看板 | `examples/README.md` | 示例用于理解流程，不是能力事实源或视觉模板 |

## 当前远端能力线索

每次仍需从 `toolkit/README.md` 重新确认。近期可用能力包括：

- 标的消歧与代码表：`tickers-search`、`tickers-list`
- 个股/指数行情：`prices-*`、`index-*`
- 财务报表与财务指标：`financials-*`、`financials-indicators`
- 涨停股票池、连板天梯：`limit-up-pool`、`limit-up-ladder`
- 当日个股异动：`anomaly-analysis-list`、`anomaly-analysis-stock`
- 飙升榜、热股榜、历史热股榜、热股排名趋势：`skyrocket-list`、`hot-stock-list`、`hot-stock-list-history`、`hot-stock-rank-trend`
- 龙虎榜：`dragon-tiger-list`

## Agent 执行流程

1. 明确标的、时间范围、新鲜度、复权口径和交付形式。
2. 用户给的是名称或不完整代码时，先用 `tickers-search` 消歧为唯一 `thscode`；不要猜交易所后缀。
3. 按快速路由选择 marketdb 或 fuyao，再读对应 README 的命令、schema 和限制。
4. 对不熟悉的本地 schema，先运行 `status`、`describe` 或对应 toolkit 提供的检查命令；对远端参数先查 cheatsheet/完整契约。
5. 执行取数，把原始数据与最终交付分开保存；向用户报告数据源、时间范围、口径、行数和文件路径。
6. 说明验证边界：离线测试或静态示例不能证明线上认证、服务可用性和实时数据正确；只有实际授权请求才能称为线上验证。

## 输出、认证与大数据纪律

- token/API Key 只从环境变量读取；不要要求用户粘贴到对话，不要写入代码、日志、产物或提交。
- `toolkit/fuyao/scripts/fuyao.py` 的 stdout 保持 JSON；诊断与提示走 stderr，不要污染机器可读输出。
- 不要把全市场、多年、分页或多标的原始结果输出到对话。重定向到 `/tmp/*.json` 或 `out/`，只汇报路径、行数和摘要。
- 本地已有且足够新的历史数据优先用 marketdb；不要为相同历史窗口重复调用远端 REST。
- 用户要求真实数据时不得使用模拟数据。数据不可用就报告原因和缺口。
- `examples/` 和灵感页面用于理解组合方式；使用前仍要核对 toolkit 支持范围，不得把截图或静态 HTML 当作复现标准。

## 版本更新提示

- 可以机会性检查 GitHub 公网快照是否有更新，但不得阻塞当前任务。
- 更新提示基于本地缓存中的 `HiThink-Tech/Financial-API` `main` commit；缓存过期时只触发异步刷新，不等待网络请求完成。
- 先完成用户任务，再提示更新；长期任务、定时任务和批处理不得被更新询问中断。
- 同一组本地/远端完整 SHA 在冷却期内最多提示一次；展示时使用短 SHA 和 commit 时间。
- 不要自动执行 `git pull`。检查失败、离线、非 git 安装或源码包场景静默处理。
