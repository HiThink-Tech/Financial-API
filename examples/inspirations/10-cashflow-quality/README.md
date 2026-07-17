# 现金流质量稽核台

> 按披露日审阅现金转化、自由现金流、应计与字段完整度。

## 定位

用于筛查财报数据质量、解释公司利润含金量和穿透原始字段。页面关注财务证据，不评价未来表现。

## Prompt 示例

复制下面这一段 Prompt 交给任意支持 Skill 的 Agent。无需克隆本仓库。

```markdown
请使用已安装的 `hithink-finance` Skill，生成一张“现金流质量稽核台”数据观测看板。所有真实金融数据只能来自同花顺金融数据 API

### 数据任务

1. 使用代码表明确限定最多 20 只股票的观察池；财务报表端点均为单只股票请求，不把代码表误当成批量财务接口。调用三张报表时传 `period=annual&limit=5`，按 `period_end_ms` 对齐报告期，并以 `report_date_ms` 控制披露时点。
2. 仅使用已提供字段计算：现金转化率=`act_cash_flow_net/net_profit`，自由现金流率=`(act_cash_flow_net-pay_fixed_assets_etc_cash)/operating_income`，应计利润率=`(net_profit-act_cash_flow_net)/assets_total`，应收压力=`accounts_receivable/operating_income`，净现金比例=`(cash-total_debt)/assets_total`；分母为0或缺失时留空。
3. 生成公司筛查表、利润—经营现金流桥、5年现金证据和字段完整度审计。

### 页面产物

- 生成可离线打开的单文件 HTML，所有 CSS、图表、示例数据和 JavaScript 内联。
- 页面必须显著标注数据时间、模拟/真实模式、来源 endpoint、计算口径和“非投资建议”。
- 不得把 API Key 写入浏览器；真实取数由本地服务读取环境变量中的 API Key。
- 页面定位为数据观察与视觉穿透，不添加组合评价或交易执行模块。
```

## 效果预览

[![现金流质量稽核台](preview.jpg)](example.html)

- [打开单文件 HTML](example.html)
- [返回灵感目录](../README.md)

## 同花顺金融数据能力

唯一金融数据源：同花顺金融数据 API。官方接口聚合：llms-full.txt。

- `GET /api/meta/tickers/list?asset_type=a-share`
- `GET /api/a-share/financials/income-statements`
- `GET /api/a-share/financials/balance-sheets`
- `GET /api/a-share/financials/cash-flow-statements`
- `GET /api/a-share/financials/indicators`

## 关键边界

- 财务点时以披露日为准，不使用未来披露的数据。
- 财务报表与财务指标均为单只股票接口；观察池扩大时必须控制并发、缓存结果并遵守权限与限流。
- 金融行业报表结构特殊，需要单独审阅；分母为0或无限值时指标留空。

> 示例页面使用模拟数据展示布局与交互，不代表真实最新结果，也不构成投资建议。
