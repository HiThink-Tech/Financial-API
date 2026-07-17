# 单股行情与趋势速览

> 一句话生成单股价格、均线、回撤与成交额联动的交互看板。

## 定位

第一次使用服务、快速了解某只 A 股近期表现，或建立轻量日常复盘入口。默认示例标的是同花顺（`300033.SZ`）。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，为"同花顺"生成一张"单股行情与趋势速览"看板；不假设本地存在任何项目仓库。

### 数据任务

1. 按 Skill 规则复用统一 API Key，优先使用 `hithink-finance` CLI；先查看 `capabilities --format json`，再按需查看 `schema symbol.search`、`schema market.snapshot` 和 `schema market.history`。
2. 用 `symbol search` 将"同花顺"消歧为唯一 A 股 `thscode`，再获取最新行情和最近约 250 个交易日的前复权日 K。
3. 计算区间涨跌幅、MA20/MA60/MA120、近 60 日最大回撤和 20 日平均成交额。原始长序列写入临时文件，不要粘贴到对话。

### 页面产物

- 直接生成当前目录下的 `stock-overview.html` 并在完成后打开预览。
- 必须是可离线打开的单文件 HTML：CSS、图表、数据和 JavaScript 全部内联，不使用 CDN、框架、网络字体或运行时请求。页面应具备现代金融数据产品的专业感和清晰信息层级，具体布局、配色和视觉风格自由发挥。
- 历史数据包含 OHLC 时优先展示 K 线，并联动成交量和均线；支持悬停十字光标与日期价格详情，以及滚轮缩放、拖拽平移、窗口切换或等价的区间探索。交互需兼顾窄屏和键盘操作。
- 标明标的代码、数据时间、前复权口径、数据源和"非投资建议"。不得写入 API Key，不得用模拟数据填补失败项；失败时在页面中如实说明。
```

## 效果预览

[![单股行情与趋势速览](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /api/meta/tickers/search`
- `GET /api/a-share/prices/snapshot`
- `GET /api/a-share/prices/historical`

## 关键边界

- 推荐路径：CLI。
- 数据范围：单只 A 股；最近约 250 个交易日；默认前复权。
- 前置条件：仅需安装 `hithink-finance` Skill；Skill 会复用统一凭据并在需要时引导使用 CLI。
- 产物约束：单文件 HTML，所有样式、图表、数据和交互内联，无外部依赖、无运行时取数。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
