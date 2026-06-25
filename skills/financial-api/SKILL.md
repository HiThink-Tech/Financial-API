---
name: financial-api
description: Use when working with financial data in this repository, including market data, historical prices, live snapshots, financial statements, symbol lookup, trading calendars, adjustment factors, THS index catalogs / constituents / index K-lines (含沪深 300 / 概念板块 / 行业指数), limit-up stock pool / consecutive-board ladder (涨停股票池 / 连板天梯), local databases, remote APIs, SQL queries, exports, or toolkit-based data access. 适用于本仓库内金融数据取数、查询、分析、导出等任务；必须先扫描 toolkit 判断当前支持的数据类型和资产范围。
---

# Financial API

这是项目内 skill。`toolkit/` 是唯一事实来源，本 skill 只负责触发和路由。

## 第一步：能力扫描

在选择数据路径前，先读：

- `toolkit/README.md`

判断用户请求的资产类别、数据类型、新鲜度要求、输出形态，当前项目是否支持。

如果当前不支持，要明确说明，并在可能时给出最接近的已支持替代方案。

## 扫描后再路由

使用当前 `toolkit/README.md` 中的路由规则，不要依赖本 skill 里的固定假设。

当前主要路径是：

- 本地历史行情、复权因子、面板、因子研究、对本地数据库写 SQL：
  读取 `toolkit/marketdb/README.md`
- 远端或新鲜数据、实时快照、财报、标的目录、交易日历、**同花顺指数（含板块/行业/沪深 300）的列表与成分股 / 指数行情**、**涨停股票池 / 连板天梯**：
  读取 `toolkit/fuyao/README.md`

如果 `toolkit/README.md` 后续新增了其他数据域或资产类别，按那里的最新路由执行。

## 操作规则

- 如果请求的数据已经在本地数据库中，优先使用本地数据。
- 新鲜数据、实时数据、本地缺失数据或非本地数据，走远端 API。
- 不要把全市场、多年、分页、多标的原始结果直接贴进对话。
- 大结果重定向到 `/tmp/*.json` 或 `out/`，然后只汇报行数、文件路径和摘要。
- 不要要求用户把 token 粘贴到对话里；只通过环境变量读取。
- 对不熟悉的 schema，先运行 toolkit 提供的 schema、status 或 describe 命令，再写查询。

## 版本更新提示

- 可以机会性检查 GitHub 公网快照是否有更新，但不得打断用户当前任务。
- 更新提示基于本地缓存中的 `HiThink-Tech/Financial-API` `main` commit 结果；缓存过期时只触发异步刷新，不等待 GitHub 请求完成。
- 如果缓存显示公网 `main` commit 新于本地 checkout，在任务完成后再询问用户是否需要更新。
- 同一个本地完整 SHA 和同一个远端完整 SHA 在提示冷却期内最多提示一次；不要在频繁金融查询或连续工具调用中重复占用用户终端或 agent 上下文。
- 展示版本时使用短 SHA 和 commit 时间；内部比较必须使用完整 SHA。
- 不要自动执行 `git pull`，除非用户明确同意。
- 检查失败、网络不可用、非 git 安装或源码下载包场景全部静默；失败后进入本地冷却期，避免反复访问 GitHub。
- 对长任务、定时任务或批量分析，先完成主任务，再给出更新建议。
