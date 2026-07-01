# 单股财务体检

> 将利润表、资产负债表、现金流量表和财务指标组织成事实清晰的公司体检页。

## 适用场景

财报发布后的快速阅读、基本面初筛，以及检查利润、现金流与杠杆是否相互匹配。默认示例标的是同花顺（`300033.SZ`）。

## Prompt 示例

```text
请在当前仓库中制作一张“单股财务体检”金融看板。先读取 AGENTS.md、skills/financial-api/SKILL.md 和 toolkit/README.md，并只使用当前 toolkit 已暴露能力。输入标的默认为“同花顺”，先用 tickers-search 确认唯一 thscode；通过 toolkit/fuyao 分别获取最近 8 期季度利润表、资产负债表、现金流量表，并根据最新已披露报告期调用 financials-indicators。围绕增长、盈利、现金流、杠杆四个维度做事实性分析，至少展示营业收入、归母净利润、经营活动现金流、总资产、总负债以及接口提供的关键财务指标；字段缺失时保持空缺并说明，不自行推算不同口径字段。生成可直接打开的单文件 HTML，保存到 out/inspirations/financial-health.html。视觉方案和图表形式由你自由设计，但需标注报告期、数据源、字段口径和非投资建议声明。不要读取或模仿 examples/inspirations 下的截图和示例 HTML。不得使用模拟数据，不补充项目当前未提供的估值、资讯或 F10 数据；原始响应落盘，不要在对话中输出完整财务记录，也不要将 API Key 写入文件。
```

## 效果预览

下图只展示一种可能效果，不是页面模板或复现标准。

![单股财务体检示例](preview.jpg)

[打开示例静态 HTML](example.html)

## 能力与口径

- 路径：`tickers-search`、`financials-income`、`financials-balance`、`financials-cashflow`、`financials-indicators`。
- 范围：单只 A 股；最近 8 个季度；以接口已披露报告期为准。
- 前置条件：设置 `FUYAO_TOKEN` 或 `API_KEY`。
