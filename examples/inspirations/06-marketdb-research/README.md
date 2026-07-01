# 本地全市场趋势研究

> 用 marketdb 的本地全市场面板构建可复用的趋势与流动性研究视图。

## 适用场景

已经完成本地数据库初始化，希望一次扫描全市场数据，构建横截面研究看板或候选池。

## Prompt 示例

```text
请在当前仓库中制作一张“本地全市场趋势研究”金融看板。先读取 AGENTS.md、skills/financial-api/SKILL.md、toolkit/README.md 和 toolkit/marketdb/README.md。先运行 marketdb status/describe 确认 data/market.duckdb 的最新日期和可用视图；数据库不存在或数据过旧时停止并给出 python bootstrap.py / marketdb auto-sync 指引，不要静默改用全市场远端逐股请求。数据库可用时，通过 MarketDB.get_panel 或等价 SQL 一次读取最近约 80 个交易日的前复权全市场面板，把明细保存到 out/inspirations-data/，计算每只股票的 20 日涨跌幅、20 日平均成交额、60 日最大回撤和均线结构，再按明确规则汇总市场上涨占比、强趋势数量、流动性分层和代表股票。生成可直接打开的单文件 HTML 到 out/inspirations/marketdb-research.html。页面和图表可以自由设计，但必须显示数据库最新日期、样本数、过滤规则、复权口径和非投资建议声明。不要读取或模仿 examples/inspirations 中的截图和示例 HTML，不使用模拟数据，不把全市场明细输出到对话，也不要把筛选结果表述为投资推荐。
```

## 效果预览

下图只展示一种可能效果，不是页面模板或复现标准。

![本地全市场趋势研究示例](preview.jpg)

[打开示例静态 HTML](example.html)

## 能力与口径

- 路径：`marketdb status`、`marketdb describe`、`MarketDB.get_panel` 或本地 SQL。
- 范围：本地数据库中的 A 股日线；示例窗口约 80 个交易日；大结果必须落盘。
- 前置条件：运行 `python bootstrap.py` 并确认 `data/market.duckdb` 可用。
