# 自选股当日异动监控

> 把一组自选股的实时行情和同花顺当日异动原因合并成轻量监控页。

## 适用场景

快速查看自选股中哪些标的在当日出现明显异动，以及接口给出的事实性原因。默认观察同花顺、贵州茅台和平安银行。

## Prompt 示例

```text
请在当前仓库中制作一张“自选股当日异动监控”金融看板。先读取 AGENTS.md、skills/financial-api/SKILL.md 和 toolkit/README.md。输入默认为“同花顺、贵州茅台、平安银行”，使用 tickers-search 逐一消歧并去重，最多保留 20 只 A 股；再用 prices-snapshot 批量获取行情，并用 anomaly-analysis-stock 查询这些代码的当日异动原因。把响应保存到 out/inspirations-data/，按涨跌幅或是否存在异动组织页面，展示最新价、涨跌幅、成交额、异动标签、异动时间和接口原因，生成可直接打开的单文件 HTML 到 out/inspirations/watchlist-anomalies.html。页面布局、配色、交互和图表由你自由设计，但必须明确异动能力仅覆盖接口当前交易日，未返回异动不能解释为股票没有任何市场事件。不要读取或模仿 examples/inspirations 中的示例资产，不扩展到用户未输入股票，不使用模拟数据，不预测未来走势；标注行情时间、数据来源和非投资建议声明，不要将 API Key 写入任何输出。
```

## 效果预览

下图只展示一种可能效果，不是页面模板或复现标准。

![自选股当日异动监控示例](preview.jpg)

[打开示例静态 HTML](example.html)

## 能力与口径

- 路径：`tickers-search`、`prices-snapshot`、`anomaly-analysis-stock`。
- 范围：最多 20 只 A 股；异动原因仅限接口当前交易日。
- 前置条件：设置 `FUYAO_TOKEN` 或 `API_KEY`。
