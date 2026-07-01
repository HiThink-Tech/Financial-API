# 同花顺概念板块联动

> 将同花顺概念指数、区间行情和当前成分股放在一起观察板块整体表现。

## 适用场景

理解一个概念或行业板块包含哪些股票，以及板块指数在指定区间内如何变化。默认从“机器人”相关概念中选择一个唯一指数。

## Prompt 示例

```text
请在当前仓库中制作一张“同花顺概念板块联动”金融看板。先读取 AGENTS.md、skills/financial-api/SKILL.md 和 toolkit/README.md，并遵守大数据结果落盘规则。输入概念默认为“机器人”；调用 toolkit/fuyao 的 index-catalog --tag cn_concept，把完整目录保存到 out/inspirations-data/ 后在本地筛选名称，若有多个候选先列出候选并选择名称最匹配的一项，同时在页面标明选择结果。随后调用 index-constituents 获取当前成分股，调用 index-historical 获取最近约 120 个自然日的日线行情；只对少量代表性成分股调用 prices-snapshot，不能把全量成分股逐只请求。计算指数区间涨跌幅、近 20 日波动、成交额变化和成分股数量，生成可直接打开的单文件 HTML 到 out/inspirations/index-constituents.html。页面设计由你自由发挥，但板块股票池关系与指数行情必须分开展示，并提示指数涨跌不能证明单只股票的概念相关度。不要读取或模仿 examples/inspirations 中的示例资产，不使用模拟数据，不引入当前 toolkit 未提供的公司画像或资讯；保留指数代码、数据日期、来源和非投资建议声明，不要在对话中粘贴完整目录或成分股列表。
```

## 效果预览

下图只展示一种可能效果，不是页面模板或复现标准。

![同花顺概念板块联动示例](preview.jpg)

[打开示例静态 HTML](example.html)

## 能力与口径

- 路径：`index-catalog`、`index-constituents`、`index-historical`，可选 `prices-snapshot`。
- 范围：单一同花顺概念、当前成分股、约 120 个自然日的指数日线。
- 前置条件：设置 `FUYAO_TOKEN` 或 `API_KEY`。
