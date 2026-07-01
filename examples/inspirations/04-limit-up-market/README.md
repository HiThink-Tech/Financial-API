# 涨停池与连板天梯

> 用同花顺特色数据观察当日涨停结构与近 30 个交易日的连板高度变化。

## 适用场景

盘后理解短线市场结构，观察涨停数量、连板高度和不同行业分布，而不是生成交易指令。

## Prompt 示例

```text
请在当前仓库中制作一张“涨停池与连板天梯”金融看板。开始前读取 AGENTS.md、skills/financial-api/SKILL.md 和 toolkit/README.md，只调用当前 toolkit/fuyao 已暴露的 limit-up-pool 与 limit-up-ladder。limit-up-pool 使用服务端当前日期，按连板天数或封单金额排序并限制在合理页大小；limit-up-ladder 使用接口返回的近 30 个交易日矩阵。将原始响应保存到 out/inspirations-data/，计算当日涨停股票数、最高连板、连板层级分布、行业分布和封单额较高的代表股票，再生成可直接打开的单文件 HTML 到 out/inspirations/limit-up-market.html。页面结构和视觉表达由你决定，可以采用天梯、矩阵、榜单或其他合适形式，但必须保留接口返回的交易日期和更新时间，明确“当前涨停池”与“近 30 日连板天梯”的时间范围差异。不要读取或模仿 examples/inspirations 中的示例截图和 HTML，不自行补算涨停原因，不使用模拟数据，不输出买卖建议，也不要在对话中粘贴完整股票池。
```

## 效果预览

下图只展示一种可能效果，不是页面模板或复现标准。

![涨停池与连板天梯示例](preview.jpg)

[打开示例静态 HTML](example.html)

## 能力与口径

- 路径：`limit-up-pool`、`limit-up-ladder`。
- 范围：服务端当前交易日涨停池；接口返回的近 30 个交易日连板矩阵。
- 前置条件：设置 `FUYAO_TOKEN` 或 `API_KEY`；非交易时段以接口返回日期为准。
