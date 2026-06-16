---
name: financial-api
description: Use when working with financial data in this repository, including market data, historical prices, live snapshots, financial statements, symbol lookup, trading calendars, adjustment factors, local databases, remote APIs, SQL queries, exports, or toolkit-based data access. 适用于本仓库内金融数据取数、查询、分析、导出等任务；必须先扫描 toolkit 判断当前支持的数据类型和资产范围。
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
- 远端或新鲜数据、实时快照、财报、标的目录、交易日历：
  读取 `toolkit/fuyao/README.md`

如果 `toolkit/README.md` 后续新增了其他数据域或资产类别，按那里的最新路由执行。

## 操作规则

- 如果请求的数据已经在本地数据库中，优先使用本地数据。
- 新鲜数据、实时数据、本地缺失数据或非本地数据，走远端 API。
- 不要把全市场、多年、分页、多标的原始结果直接贴进对话。
- 大结果重定向到 `/tmp/*.json` 或 `out/`，然后只汇报行数、文件路径和摘要。
- 不要要求用户把 token 粘贴到对话里；只通过环境变量读取。
- 对不熟悉的 schema，先运行 toolkit 提供的 schema、status 或 describe 命令，再写查询。
