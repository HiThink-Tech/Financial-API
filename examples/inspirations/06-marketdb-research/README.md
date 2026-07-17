# 本地全市场趋势研究（进阶）

> 用本地 DuckDB 面板生成市场宽度、趋势结构与流动性分层看板。

## 定位

已经初始化本地行情库，希望一次扫描全市场、构建可复用横截面研究视图的进阶用户。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，生成一张"本地全市场趋势研究"看板；不假设本地存在项目仓库或 Python SDK。这是进阶任务。

### 数据任务

1. 优先使用 `hithink-finance` CLI，先运行 `data status` 与 `db describe`，确认本地 DuckDB 路径、schema 和最新交易日。若数据库不存在，不要静默发起全市场远端逐股请求；说明 `data init` 是长任务并在获得确认后再初始化。
2. 数据库可用时，用 `market panel --output` 将最近约 80 个交易日的前复权全市场面板导出到临时 Parquet；或用只读 SQL/`db export` 直接生成每只股票的 20 日涨跌幅、MA20/MA60、20 日平均成交额等横截面指标。
3. 汇总市场上涨占比、强趋势数量、流动性分层和代表股票。全市场明细只落盘，不能写入对话；筛选结果不得表述为推荐。

### 页面产物

- 直接生成当前目录下的 `marketdb-research.html` 并打开预览。
- 必须是无外部依赖的单文件 HTML，内联 CSS、图表、压缩后的必要摘要和 JavaScript。页面应具备现代金融数据产品的专业感和清晰信息层级，具体布局、配色和视觉风格自由发挥。
- 使用散点、分布、热力图或其他适合横截面的可视化，支持悬停查看样本详情，并提供 20 日涨幅阈值、流动性或等价的联动筛选；适配窄屏和键盘操作。
- 展示数据库最新日期、样本数、窗口、筛选规则和前复权口径，并明确本地数据新鲜度。
- 标明本地数据源和"非投资建议"；不得嵌入全市场原始明细、数据库文件或任何凭据。
```

## 效果预览

[![本地全市场趋势研究（进阶）](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /dump/market-dumps/daily-k/download-url`
- `GET /dump/market-dumps/adjustment-factors/download-url`
- 本地 DuckDB 面板读写（`data status`、`db describe`、`market panel`、`db export`）

## 关键边界

- 推荐路径：CLI · 本地 DuckDB。
- 数据范围：本地 A 股前复权日线；示例窗口约 80 个交易日；全市场明细必须落盘。
- 前置条件：进阶：仅需 Skill 与 CLI，但必须已完成本地数据库初始化；首次初始化是长任务。
- 产物约束：单文件 HTML，所有样式、图表、数据和交互内联，无外部依赖、无运行时取数。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
