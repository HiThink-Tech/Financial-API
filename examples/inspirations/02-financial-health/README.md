# 单股财务体检

> 用三张报表和财务指标生成增长、盈利、现金流与杠杆体检页。

## 定位

财报发布后的快速阅读、基本面初筛，以及核对利润、现金流与资产负债结构是否相互匹配。默认示例标的是同花顺。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，通过 REST API 为"同花顺"生成一张"单股财务体检"看板；不假设本地存在项目仓库、CLI 或 Python SDK。

### 数据任务

1. 按 Skill 的统一凭据规则安全读取 API Key，调用 `GET /api/meta/tickers/search` 将"同花顺"消歧为唯一 A 股 `thscode`；请求头使用 `X-api-key`，不得回显凭据。
2. 分别调用利润表、资产负债表和现金流量表端点，读取最近 8 期 `quarterly` 数据；按 `period_end_ms` 对齐三表，并根据最新报告期调用财务指标端点。
3. 围绕增长、盈利、现金流和杠杆做事实性归纳。`null` 保持缺失，不补零；不要混淆单季值、累计值或不同报告期，也不要编造估值、行业均值和评分。

### 页面产物

- 直接生成当前目录下的 `financial-health.html` 并打开预览。
- 产物必须是无外部依赖、无运行时请求的单文件 HTML，内联 CSS、图表、数据和 JavaScript。页面应具备现代金融数据产品的专业感和清晰信息层级，具体布局、配色和视觉风格自由发挥。
- 展示核心财务数值、同期对比、可切换的收入/利润/现金流序列，以及报告期和字段口径说明；图表支持悬停查看报告期详情，页面需适配手机宽度和键盘操作。
- 标明数据源、报告期、币种和"非投资建议"。原始响应只落到临时目录，不写入 HTML；API Key 不得进入文件、日志或对话。
```

## 效果预览

[![单股财务体检](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /api/meta/tickers/search`
- `GET /api/a-share/financials/income-statements`
- `GET /api/a-share/financials/balance-sheets`
- `GET /api/a-share/financials/cash-flow-statements`
- `GET /api/a-share/financials/indicators`

## 关键边界

- 推荐路径：REST API。
- 数据范围：单只 A 股；最近 8 期季度报表；以最新已披露报告期为准。
- 前置条件：仅需安装 Skill 并配置统一凭据；无需 CLI、Python SDK 或仓库源码。
- 产物约束：单文件 HTML，所有样式、图表、数据和交互内联，无外部依赖、无运行时取数。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
